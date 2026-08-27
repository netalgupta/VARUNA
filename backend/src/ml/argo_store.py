"""
Real ARGO Data Store — dual-Supabase access layer for VARUNA ML (Member 3)
==========================================================================

VARUNA's Argo archive (~3.96M observations) is split across two Supabase
Postgres projects because the dataset outgrew the free-tier storage of the
first one. This module implements the time-based routing described in the
data contract so the ML models never need to know which project holds a
given observation:

    DB-A  2022-01-01 → 2025-07-31   (historical)
    DB-B  2025-08-01 → present      (current)

IMPORTANT: the physical mapping of "which URL holds which window" was found
to be SWAPPED relative to early team docs, so routing here is CONTENT-BASED:
each DSN's actual [min(time), max(time)] range is probed once and cached,
then every request is routed by its time window. A window that straddles the
boundary is served from both projects and merged.

Capabilities
------------
1. `build_history_grid(basin, end_date)` — real (T=30, 3, H, W) physical grid
   [sst_c, psal, doxy] for `mhw_forecast.set_history_provider()`. Observations
   are aggregated server-side into 2°×2° cells × day (near-surface slab),
   then gap-filled: temporal interpolation → inverse-distance spatial fill →
   basin-mean fallback. Returns coverage metadata alongside the array.
2. `fetch_profiles(...)` — real vertical casts (pres/temp/psal) resampled onto
   the QC module's logarithmic pressure grid, for autoencoder training and
   threshold calibration.
3. `real_climatology(basin)` — per-cell day-of-year SST climatology derived
   from the full multi-year archive, used as the anomaly baseline.

All results are cached on disk (`cache/`, npz + json) and in memory with a
TTL so live inference stays < 100 ms warm; network I/O only happens on cache
miss or TTL expiry. Every public function degrades gracefully: on any
database error the caller can fall back to the physics-informed synthetic
generators in `mhw_forecast` / `qc_autoencoder`.
"""

from __future__ import annotations

import json
import os
import threading
import time
import zlib
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, cast
import numpy as np

try:
    import psycopg  # type: ignore
    from psycopg.rows import dict_row  # type: ignore
    _HAS_PSYCOPG = True
except ImportError:
    psycopg = None  # type: ignore
    dict_row = None  # type: ignore
    _HAS_PSYCOPG = False

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

#: The two Supabase projects. Order is irrelevant — ranges are probed.
DEFAULT_DSNS: Tuple[str, str] = (
    # aws-0-ap-southeast-2 pooler — verified content: 2025-08-01 → present
    "postgresql://postgres.skbxtnjcvutzgkzgrrxr:HelloWorldIsSoLame"
    "@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
    # aws-0-ap-northeast-2 pooler — verified content: 2022-01-01 → 2025-07-31
    "postgresql://postgres.anpvaxwncqsxetujkqce:HelloWorldIsSoLame"
    "@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres",
)


def configured_dsns() -> List[str]:
    """
    DSN resolution order:
      1. process env  VARUNA_ARGO_DB_URLS='dsn_a;dsn_b'
      2. src.config Settings (backend/.env via pydantic-settings)
      3. built-in defaults (the two VARUNA Supabase projects)
    """
    raw = os.getenv("VARUNA_ARGO_DB_URLS", "").strip()
    if not raw:
        try:
            from src.config import get_settings

            raw = str(getattr(get_settings(), "argo_db_urls", "") or "").strip()
        except Exception:
            raw = ""
    if not raw:
        return list(DEFAULT_DSNS)
    return [u.strip() for u in raw.split(";") if u.strip()]


CACHE_DIR = Path(__file__).resolve().parent / "cache"
GRID_TTL_S = 6 * 3600        # history grids refresh at most every 6 h
CLIMATOLOGY_TTL_S = 30 * 24 * 3600  # climatology is stable for weeks
PROFILE_TTL_S = 7 * 24 * 3600       # training profiles refresh weekly

# ─────────────────────────────────────────────────────────────────────────────
# Basin geometry (kept identical to mhw_forecast to avoid circular imports)
# ─────────────────────────────────────────────────────────────────────────────


def basin_windows() -> Dict[str, Tuple[float, float, float, float]]:
    """(lat_min, lat_max, lon_min, lon_max) per basin — mirrors mhw_forecast."""
    return {
        "arabian_sea": (4.0, 26.0, 52.0, 76.0),
        "bay_of_bengal": (4.0, 24.0, 78.0, 98.0),
        "equatorial_io": (-10.0, 10.0, 45.0, 95.0),
    }


GRID_H = GRID_W = 12          # canonical internal grid (matches mhw_forecast)
HISTORY_DAYS = 30             # model input window
N_VARS = 3                    # sst_c, psal, doxy
NEAR_SURFACE_PRES = 20.0      # dbar — mixed-layer slab treated as SST proxy
MIN_CELLS_OBSERVED = 0.10     # min fraction of grid cells with any observation

# ─────────────────────────────────────────────────────────────────────────────
# Low-level connectivity + time-range routing
# ─────────────────────────────────────────────────────────────────────────────

_LOCK = threading.Lock()
_RANGE_CACHE: Dict[str, Tuple[Optional[datetime], Optional[datetime]]] = {}


def _connect(dsn: str) -> Any:
    if not _HAS_PSYCOPG or psycopg is None:
        raise RuntimeError("psycopg is not installed. Live ARGO database query skipped.")
    return psycopg.connect(dsn, connect_timeout=15, sslmode="require")


def probe_range(dsn: str) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Actual [min(time), max(time)] of marine_data on one project (cached)."""
    if not _HAS_PSYCOPG:
        return (None, None)
    with _LOCK:
        if dsn in _RANGE_CACHE:
            return _RANGE_CACHE[dsn]
    lo_hi: Tuple[Optional[datetime], Optional[datetime]] = (None, None)
    with _connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("SELECT min(time), max(time) FROM marine_data")
        row = cur.fetchone()
        if row and row[0] is not None:
            lo_hi = (row[0], row[1])
    with _LOCK:
        _RANGE_CACHE[dsn] = lo_hi
    return lo_hi


class RoutedWindow:
    """One time-window query routed across both Supabase projects."""

    def __init__(self, start: datetime, end: datetime):
        self.start, self.end = start, end
        self.segments: List[Tuple[str, datetime, datetime]] = []
        for dsn in configured_dsns():
            lo, hi = probe_range(dsn)
            if lo is None or hi is None:
                continue
            s, e = max(start, lo), min(end, hi)
            if s <= e:
                self.segments.append((dsn, s, e))
        if not self.segments:
            raise RuntimeError(
                f"No ARGO database covers {start} → {end}. "
                "Check VARUNA_ARGO_DB_URLS / connectivity."
            )

    def run(self, sql_template: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute `sql_template` per segment (%(seg_start)s/%(seg_end)s injected)."""
        rows: List[Dict[str, Any]] = []
        for dsn, seg_start, seg_end in self.segments:
            seg_params = dict(params)
            seg_params["seg_start"] = seg_start
            seg_params["seg_end"] = seg_end + timedelta(seconds=1)
            with _connect(dsn) as conn, conn.cursor(row_factory=dict_row) as cur:
                cur.execute(cast(Any, sql_template), seg_params)
                rows.extend(cur.fetchall())
        return rows


# ─────────────────────────────────────────────────────────────────────────────
# Disk + memory caching helpers
# ─────────────────────────────────────────────────────────────────────────────

_MEM_CACHE: Dict[str, Tuple[float, Any]] = {}
_MEM_LOCK = threading.Lock()


def _mem_get(key: str, ttl_s: float) -> Optional[Any]:
    with _MEM_LOCK:
        hit = _MEM_CACHE.get(key)
        if hit and (time.time() - hit[0]) < ttl_s:
            return hit[1]
    return None


def _mem_put(key: str, value: Any) -> None:
    with _MEM_LOCK:
        _MEM_CACHE[key] = (time.time(), value)


def _disk_fresh(path: Path, ttl_s: float) -> bool:
    return path.exists() and (time.time() - path.stat().st_mtime) < ttl_s


def _load_grid_cache(name: str, ttl_s: float) -> Optional[Dict[str, Any]]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / name
    if not _disk_fresh(path, ttl_s):
        return None
    try:
        with np.load(path, allow_pickle=False) as z:
            # meta was persisted via np.frombuffer(json_bytes, dtype=np.uint8);
            # recover the exact bytes with tobytes() (str() of a uint8 array
            # is NOT valid JSON).
            meta = json.loads(z["meta"].tobytes().decode("utf-8"))
            return {"grid": z["grid"], **meta}
    except Exception:
        return None


def _save_grid_cache(name: str, grid: np.ndarray, meta: Dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        CACHE_DIR / name, grid=grid, meta=np.frombuffer(json.dumps(meta).encode(), dtype=np.uint8)
    )


# ─────────────────────────────────────────────────────────────────────────────
# Gap filling
# ─────────────────────────────────────────────────────────────────────────────


def _temporal_fill(series: np.ndarray) -> np.ndarray:
    """Linearly interpolate NaN gaps along axis 0 (time); hold edges constant."""
    n_days = series.shape[0]
    idx = np.arange(n_days)
    out = series.copy()
    flat = out.reshape(n_days, -1)
    for j in range(flat.shape[1]):
        col = flat[:, j]
        good = np.isfinite(col)
        if not good.any():
            continue
        if not good.all():
            flat[:, j] = np.interp(idx, idx[good], col[good])
    return out.reshape(series.shape)


def _spatial_diffuse(field: np.ndarray, passes: int = 60) -> np.ndarray:
    """
    Fill all-NaN cells by iterative inverse-distance diffusion from filled
    neighbours (Gauss-Seidel style averaging over 4-neighbourhood).
    """
    out = field.copy()
    known = np.isfinite(out)
    for _ in range(passes):
        if known.all():
            break
        padded = np.pad(out, ((1, 1), (1, 1)), mode="edge")
        acc = np.zeros_like(out)
        wsum = np.zeros_like(out)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nb = padded[1 + dy : 1 + dy + out.shape[0], 1 + dx : 1 + dx + out.shape[1]]
            w = np.isfinite(nb).astype(np.float64)
            acc += np.nan_to_num(nb) * w
            wsum += w
        fillable = (~known) & (wsum > 0)
        out[fillable] = acc[fillable] / wsum[fillable]
        known = np.isfinite(out)
    return out


def _cell_coords(basin: str) -> Tuple[np.ndarray, np.ndarray]:
    """Cell-center lat/lon coordinate meshes for a basin's internal grid."""
    lat0, lat1, lon0, lon1 = basin_windows()[basin]
    lat_c = lat0 + (np.arange(GRID_H) + 0.5) * (lat1 - lat0) / GRID_H
    lon_c = lon0 + (np.arange(GRID_W) + 0.5) * (lon1 - lon0) / GRID_W
    lon_m, lat_m = np.meshgrid(lon_c, lat_c)
    return lat_m.astype(float), lon_m.astype(float)


# ─────────────────────────────────────────────────────────────────────────────
# Real 30-day history grid (MHW forecaster provider)
# ─────────────────────────────────────────────────────────────────────────────

_GRID_SQL = """
SELECT floor(latitude / %(cell_deg)s)::int AS la_bin,
       floor(longitude / %(cell_deg)s)::int AS lo_bin,
       date_trunc('day', time)::date AS day,
       avg(temp) AS temp, avg(psal) AS psal, avg(doxy) AS doxy,
       count(*) AS n
FROM marine_data
WHERE time >= %(seg_start)s AND time < %(seg_end)s
  AND latitude  >= %(lat_min)s AND latitude  <= %(lat_max)s
  AND longitude >= %(lon_min)s AND longitude <= %(lon_max)s
  AND pres <= %(pmax)s
GROUP BY 1, 2, 3
"""


def fetch_daily_cell_stats(
    basin: str, end_date: date, lookback_days: int = HISTORY_DAYS + 10
) -> List[Dict[str, Any]]:
    """Server-side aggregation of near-surface observations into day × 2° cells."""
    lat0, lat1, lon0, lon1 = basin_windows()[basin]
    win = RoutedWindow(
        datetime.combine(end_date - timedelta(days=lookback_days), datetime.min.time()),
        datetime.combine(end_date, datetime.min.time()) + timedelta(days=1),
    )
    return win.run(
        _GRID_SQL,
        {
            "cell_deg": 2.0,
            "lat_min": lat0,
            "lat_max": lat1,
            "lon_min": lon0,
            "lon_max": lon1,
            "pmax": NEAR_SURFACE_PRES,
        },
    )


def build_history_grid(
    basin: str,
    end_date: Optional[date] = None,
    n_days: int = HISTORY_DAYS,
) -> Dict[str, Any]:
    """
    Real observation grid for one basin:

    Returns
    -------
    {"grid": (n_days, 3, GRID_H, GRID_W) [sst_c, psal, doxy],
     "coverage": float   — fraction of (day, cell, var=temp) directly observed
                           before gap-filling (0..1),
     "source": "live_argo",
     "days": [iso, ...]}
    Raises RuntimeError when coverage is too thin to be trustworthy.
    """
    end_date = end_date or date.today()
    key = f"grid:{basin}:{end_date.isoformat()}:{n_days}"
    cached = _mem_get(key, GRID_TTL_S)
    if cached is not None:
        return cached
    fname = f"grid_{basin}_{end_date.isoformat()}_{n_days}.npz"
    disk = _load_grid_cache(fname, GRID_TTL_S)
    if disk is not None:
        _mem_put(key, disk)
        return disk

    rows = fetch_daily_cell_stats(basin, end_date, lookback_days=n_days + 10)
    if not rows:
        raise RuntimeError(f"No real ARGO observations for basin '{basin}' near {end_date}")

    lat0, lat1, lon0, lon1 = basin_windows()[basin]
    # Strict calendar window ending at end_date -> always exactly n_days frames
    # (days without any observation become NaN and are filled later).
    days = [end_date - timedelta(days=n_days - 1 - i) for i in range(n_days)]
    day_index = {d: i for i, d in enumerate(days)}

    # Accumulate sums/counts: several global 2° bins can collapse into one
    # internal-grid column when a basin window is not an exact multiple of 2°.
    var_cols = ("temp", "psal", "doxy")
    vsum = np.zeros((len(days), N_VARS, GRID_H, GRID_W))
    vcnt = np.zeros((len(days), N_VARS, GRID_H, GRID_W))
    obs_counts = np.zeros((len(days), GRID_H, GRID_W))

    fy_scale = GRID_H / (lat1 - lat0)
    fx_scale = GRID_W / (lon1 - lon0)
    half_cell = 1.0  # global SQL lattice is 2° wide -> center offset +1°
    for r in rows:
        di = day_index.get(r["day"])
        if di is None:
            continue
        # Global 2°-bin CENTER in degrees: floor(lat/2)*2 + 1
        cy = float(r["la_bin"]) * 2.0 + half_cell
        cx = float(r["lo_bin"]) * 2.0 + half_cell
        ie = int((cy - lat0) * fy_scale)
        je = int((cx - lon0) * fx_scale)
        if not (0 <= ie < GRID_H and 0 <= je < GRID_W):
            continue
        obs_counts[di, ie, je] += int(r["n"])
        for v, col in enumerate(var_cols):
            val = r[col]
            if val is not None:
                vsum[di, v, ie, je] += float(val)
                vcnt[di, v, ie, je] += 1.0

    with np.errstate(invalid="ignore", divide="ignore"):
        fields = np.where(vcnt > 0, vsum / np.maximum(vcnt, 1.0), np.nan)

    cells_observed_frac = float(np.isfinite(fields[:, 0, :, :]).any(axis=0).mean())
    if cells_observed_frac < MIN_CELLS_OBSERVED:
        raise RuntimeError(
            f"Basin '{basin}' too sparse: only {cells_observed_frac:.1%} of grid cells "
            f"observed in the last {n_days} days"
        )

    # Per variable: fill NaN gaps along time, then diffuse across space day-by-day
    filled = np.stack(
        [
            np.stack([_spatial_diffuse(day_slice) for day_slice in _temporal_fill(fields[:, v])])
            for v in range(N_VARS)
        ],
        axis=1,
    )

    result = {
        "grid": np.asarray(filled, dtype=np.float64),
        "coverage": round(cells_observed_frac, 4),
        "source": "live_argo",
        "obs_rows": int(obs_counts.sum()),
        "days": [d.isoformat() for d in days],
    }
    _mem_put(key, result)
    _save_grid_cache(fname, result["grid"], {k: v for k, v in result.items() if k != "grid"})
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Real day-of-year SST climatology (anomaly baseline)
# ─────────────────────────────────────────────────────────────────────────────

_CLIM_SQL = """
SELECT floor(latitude / %(cell_deg)s)::int AS la_bin,
       floor(longitude / %(cell_deg)s)::int AS lo_bin,
       EXTRACT(MONTH FROM time)::int AS month,
       avg(temp) AS temp, count(*) AS n
FROM marine_data
WHERE pres <= %(pmax)s
  AND latitude  >= %(lat_min)s AND latitude  <= %(lat_max)s
  AND longitude >= %(lon_min)s AND longitude <= %(lon_max)s
GROUP BY 1, 2, 3
HAVING count(*) >= %(min_n)s
"""


def build_climatology(basin: str) -> Dict[str, Any]:
    """
    Monthly per-cell near-surface climatology from the FULL archive (all years),
    expanded to every day-of-year with cosine interpolation between month
    midpoints. Cells without data fall back to NaN (caller substitutes the
    synthetic seasonal formula).

    Returns {"clim": (366, GRID_H, GRID_W), "cells_observed": int}
    """
    key = f"clim:{basin}"
    cached = _mem_get(key, CLIMATOLOGY_TTL_S)
    if cached is not None:
        return cached
    fname = f"clim_{basin}.npz"
    disk = _load_grid_cache(fname, CLIMATOLOGY_TTL_S)
    if disk is not None:
        _mem_put(key, disk)
        return disk

    lat0, lat1, lon0, lon1 = basin_windows()[basin]
    win = RoutedWindow(datetime(2000, 1, 1), datetime(2100, 1, 1))
    rows = win.run(
        _CLIM_SQL,
        {
            "cell_deg": 2.0,
            "lat_min": lat0,
            "lat_max": lat1,
            "lon_min": lon0,
            "lon_max": lon1,
            "pmax": NEAR_SURFACE_PRES,
            "min_n": 30,
        },
    )
    # Weighted accumulation — multiple 2° bins may share one internal cell.
    fy_scale = GRID_H / (lat1 - lat0)
    fx_scale = GRID_W / (lon1 - lon0)
    msum = np.zeros((12, GRID_H, GRID_W))
    mcnt = np.zeros((12, GRID_H, GRID_W))
    for r in rows:
        cy = float(r["la_bin"]) * 2.0 + 1.0
        cx = float(r["lo_bin"]) * 2.0 + 1.0
        ie = int((cy - lat0) * fy_scale)
        je = int((cx - lon0) * fx_scale)
        if 0 <= ie < GRID_H and 0 <= je < GRID_W and r["temp"] is not None:
            msum[int(r["month"]) - 1, ie, je] += float(r["temp"])
            mcnt[int(r["month"]) - 1, ie, je] += 1.0
    with np.errstate(invalid="ignore", divide="ignore"):
        monthly = np.where(mcnt > 0, msum / np.maximum(mcnt, 1.0), np.nan)

    monthly = np.stack([_spatial_diffuse(_temporal_fill(monthly[m : m + 1])[0]) for m in range(12)])
    cells_observed = int(np.isfinite(monthly).any(axis=0).sum())

    month_mid = np.array([15.5, 45, 74.5, 105, 135.5, 166, 196.5, 227.5, 258, 288.5, 319, 349.5])
    doy_axis = np.arange(1, 367, dtype=np.float64)
    clim = np.empty((366, GRID_H, GRID_W))
    for c in range(GRID_H):
        for w in range(GRID_W):
            vals = monthly[:, c, w]
            good = np.isfinite(vals)
            if not good.any():
                clim[:, c, w] = np.nan
                continue
            # wrap-aware cosine interpolation between month midpoints
            ext_doy = np.concatenate([month_mid[good] - 365.25, month_mid[good], month_mid[good] + 365.25])
            ext_val = np.concatenate([vals[good], vals[good], vals[good]])
            order = np.argsort(ext_doy)
            clim[:, c, w] = np.interp(doy_axis, ext_doy[order], ext_val[order])

    result = {"clim": clim, "cells_observed": cells_observed, "source": "live_argo"}
    _mem_put(key, result)
    _save_grid_cache(
        fname, clim, {"cells_observed": cells_observed, "source": "live_argo"}
    )
    return result


def climatology_for(basin: str, lat_mesh: np.ndarray, lon_mesh: np.ndarray, day_of_year: int) -> np.ndarray:
    """
    Sample the real climatology at arbitrary lat/lon meshes (bilinear in space).
    Missing cells yield NaN — callers substitute their synthetic baseline.
    """
    clim = build_climatology(basin)["clim"]
    lat0, lat1, lon0, lon1 = basin_windows()[basin]
    fy = (np.clip(lat_mesh, lat0, lat1) - lat0) / (lat1 - lat0) * (GRID_H - 1)
    fx = (np.clip(lon_mesh, lon0, lon1) - lon0) / (lon1 - lon0) * (GRID_W - 1)
    y0 = np.floor(fy).astype(int); y1 = np.minimum(y0 + 1, GRID_H - 1); wy = fy - y0
    x0 = np.floor(fx).astype(int); x1 = np.minimum(x0 + 1, GRID_W - 1); wx = fx - x0

    def cell(cy: np.ndarray, cx: np.ndarray) -> np.ndarray:
        return clim[day_of_year - 1, cy, cx]

    top = cell(y0, x0) * (1 - wx) + cell(y0, x1) * wx
    bot = cell(y1, x0) * (1 - wx) + cell(y1, x1) * wx
    return top * (1 - wy) + bot * wy


# ─────────────────────────────────────────────────────────────────────────────
# Real vertical profiles (QC autoencoder training / calibration)
# ─────────────────────────────────────────────────────────────────────────────

_PROFILE_SQL = """
SELECT platform_number, cycle_number, direction,
       array_agg(pres ORDER BY pres) AS pres,
       array_agg(temp ORDER BY pres) AS temp,
       array_agg(psal ORDER BY pres) AS psal
FROM marine_data
WHERE pres BETWEEN 0.0 AND 2200.0
  AND temp IS NOT NULL AND psal IS NOT NULL
  AND time >= %(seg_start)s AND time < %(seg_end)s
GROUP BY platform_number, cycle_number, direction
HAVING count(*) >= %(min_levels)s AND max(pres) - min(pres) >= %(min_span)s
ORDER BY platform_number, cycle_number, direction
"""

#: Minimum quality bar for a cast to enter training/calibration
MIN_LEVELS = 40
MIN_SPAN_DBAR = 1200.0     # must reach deep water (P_GRID tops out at 2000)
MAX_PRES_DBAR = 2000.0


def fetch_raw_profiles() -> List[Dict[str, Any]]:
    """
    Pull deep casts from both projects — aggregation happens SERVER-SIDE
    (array_agg + HAVING), so only complete deep profiles cross the network.

    Returns [{"platform": int, "cycle": int, "dir": str,
              "pres": np.ndarray, "temp": np.ndarray, "psal": np.ndarray}, ...]
    Cached on disk for PROFILE_TTL_S.
    """
    fname = "profiles_raw.npz"
    disk_path = CACHE_DIR / fname
    if _disk_fresh(disk_path, PROFILE_TTL_S):
        try:
            with np.load(disk_path, allow_pickle=False) as z:
                meta = json.loads(z["meta"].tobytes().decode("utf-8"))
                return [
                    {**m, "pres": z["pres"][i], "temp": z["temp"][i], "psal": z["psal"][i]}
                    for i, m in enumerate(meta)
                ]
        except Exception:
            pass

    win = RoutedWindow(datetime(2000, 1, 1), datetime(2100, 1, 1))
    frames: List[Dict[str, Any]] = []
    seen: set = set()
    for dsn, seg_start, seg_end in win.segments:
        with _connect(dsn) as conn, conn.cursor() as cur:
            cur.execute(
                _PROFILE_SQL,
                {
                    "seg_start": seg_start,
                    "seg_end": seg_end,
                    "min_levels": MIN_LEVELS,
                    "min_span": MIN_SPAN_DBAR,
                },
            )
            for plat, cyc, direction, pres, temp, psal in cur.fetchall():
                k = (plat, cyc)
                if k in seen:  # ascending/descending twin — keep 'A' (ordered first)
                    continue
                seen.add(k)
                frames.append(
                    {
                        "platform": int(plat),
                        "cycle": int(cyc),
                        "dir": (direction or "?").strip(),
                        "pres": np.asarray(pres, dtype=np.float64),
                        "temp": np.asarray(temp, dtype=np.float64),
                        "psal": np.asarray(psal, dtype=np.float64),
                    }
                )

    if frames:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        meta = [{k: p[k] for k in ("platform", "cycle", "dir")} for p in frames]
        pad = max(len(p["pres"]) for p in frames)
        pres = np.full((len(frames), pad), np.nan)
        temp = np.full((len(frames), pad), np.nan)
        psal = np.full((len(frames), pad), np.nan)
        for i, p in enumerate(frames):
            n = len(p["pres"])
            pres[i, :n], temp[i, :n], psal[i, :n] = p["pres"], p["temp"], p["psal"]
        np.savez_compressed(
            disk_path,
            pres=pres, temp=temp, psal=psal,
            meta=np.frombuffer(json.dumps(meta).encode(), dtype=np.uint8),
        )
    return frames


def clean_real_profiles(
    casts: List[Dict[str, Any]],
    p_grid: np.ndarray,
    max_casts: Optional[int] = None,
    rng_seed: int = 13,
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Filter + resample raw casts onto the QC pressure grid:

    - ≥ MIN_LEVELS finite levels spanning ≥ MIN_SPAN_DBAR reaching ≥ MAX_PRES_DBAR*0.9
    - physically plausible ranges (-2°C ≤ T ≤ 40°C, 2 ≤ S ≤ 41 PSU)
    - deep-water sanity: mean salinity of the deepest 10% of levels must lie
      in [33.0, 37.5] PSU (regional deep-ocean bound — rejects garbage casts)
    - monotone non-decreasing pressure after sorting
    - linear interpolation onto P_GRID (edges held constant)

    Returns list of (temps, salinities) tuples ready for qc_autoencoder.
    """
    rng = np.random.default_rng(rng_seed)
    keep: List[Tuple[np.ndarray, np.ndarray]] = []
    for c in casts:
        p, t, s = c["pres"], c["temp"], c["psal"]
        ok = np.isfinite(p) & np.isfinite(t) & np.isfinite(s)
        p, t, s = p[ok], t[ok], s[ok]
        if len(p) < MIN_LEVELS:
            continue
        order = np.argsort(p)
        p, t, s = p[order], t[order], s[order]
        if p[-1] - p[0] < MIN_SPAN_DBAR or p[-1] < MAX_PRES_DBAR * 0.9:
            continue
        if not ((t >= -2).all() and (t <= 40).all() and (s >= 2).all() and (s <= 41).all()):
            continue
        n_deep = max(5, len(s) // 10)
        deep_s = float(np.mean(s[-n_deep:]))
        if not (33.0 <= deep_s <= 37.5):
            continue
        ti = np.asarray(np.interp(p_grid, p, t), dtype=np.float64)
        si = np.asarray(np.interp(p_grid, p, s), dtype=np.float64)
        keep.append((ti, si))
    if max_casts is not None and len(keep) > max_casts:
        sel = rng.choice(len(keep), size=max_casts, replace=False)
        keep = [keep[i] for i in sorted(sel)]
    return keep


# ─────────────────────────────────────────────────────────────────────────────
# Status helper (used by warmup / health endpoints)
# ─────────────────────────────────────────────────────────────────────────────


def real_data_enabled() -> bool:
    """
    Master switch for live-Supabase data paths (VARUNA_ML_REAL_DATA=1).
    Disabled under pytest so the suite stays deterministic/offline unless a
    test explicitly opts in by setting the variable inside its own process.
    """
    if "PYTEST_CURRENT_TEST" in os.environ:
        return os.getenv("VARUNA_TEST_ALLOW_REAL_DATA", "0") == "1"
    raw = os.getenv("VARUNA_ML_REAL_DATA", "").strip().lower()
    if raw:
        return raw in ("1", "true", "yes", "on")
    try:
        from src.config import get_settings

        return bool(getattr(get_settings(), "ml_real_data", False))
    except Exception:
        return False


def status() -> Dict[str, Any]:
    """Connectivity summary for logging/health checks. Never raises."""
    out: List[Dict[str, Any]] = []
    for dsn in configured_dsns():
        host = dsn.split("@")[-1].split("/")[0]
        try:
            lo, hi = probe_range(dsn)
            out.append(
                {"host": host, "reachable": True,
                 "min_time": lo.isoformat() if lo else None,
                 "max_time": hi.isoformat() if hi else None}
            )
        except Exception as exc:  # noqa: BLE001
            out.append({"host": host, "reachable": False, "error": str(exc)[:120]})
    return {"databases": out}
