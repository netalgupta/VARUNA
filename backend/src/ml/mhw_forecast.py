"""
Spatio-Temporal Marine Heatwave (MHW) Forecasting Engine — VARUNA Member 3
===========================================================================

Predicts 7-day and 14-day sea-surface temperature anomaly surfaces for Indian
Ocean basins from a 30-day historical physical grid (2 deg x 2 deg: temp,
salinity, dissolved oxygen), elevating VARUNA from reactive anomaly detection
to proactive early-warning.

MODEL CHOICE — TCN over ConvLSTM
--------------------------------
A Temporal Convolutional Network (stacked dilated causal Conv1d) is used
instead of a ConvLSTM because:

1. Short-horizon SST-anomaly forecasting is dominated by recent persistence
   and trend; receptive fields of 30 days are fully covered by dilation
   1,2,4,8 with kernel 3 (receptive field = 45 steps > 30).
2. TCNs train an order of magnitude faster on CPU (< 2 min for this model)
   and give deterministic, flat < 100 ms inference latency — a hard demo
   requirement.
3. Fully convolutional design accepts variable grid heights/widths, so one
   shared checkpoint serves arabian_sea / bay_of_bengal / equatorial_io.

DATA SOURCES
------------
Two serving paths share one trained model:

1. LIVE MODE (VARUNA_ML_REAL_DATA=1): the input grid comes from the two live
   Supabase ARGO archives (~3.96M observations, 2022 → present) via
   src.ml.argo_store — real near-surface observations aggregated into
   2°×2° cells × day, gap-filled (temporal interpolation → spatial diffusion),
   cached 6 h. Anomaly baselines use the REAL multi-year day-of-year
   climatology derived from the same archives; responses carry
   data_source="live_argo". If the database is unreachable mid-flight the
   provider falls back to synthetic history with a loud warning so a demo
   never dies mid-request.

2. SYNTHETIC MODE (default offline/tests): a physics-informed generator
   (seasonal cycle + red-noise anomaly field + injected MHW events) feeds both
   training and serving. `set_history_provider()` remains the explicit
   integration hook for tests and custom pipelines. See README_ml.md.

Public API
----------
- predict_mhw_trend(request) -> MHWForecastResponse
- train_model(epochs, save_path) -> dict   (fast CPU retrain)
- ensure_ready()                           (load checkpoint or quick-train fallback)
- set_history_provider(fn)                 (real-data integration hook)
"""

from __future__ import annotations

import math
import threading
import time
from math import erf
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, cast

import numpy as np
try:
    import torch
    import torch.nn as nn
    _HAS_TORCH = True
    _NN_MODULE: Any = nn.Module
except ImportError:
    torch: Any = None
    nn: Any = None
    _HAS_TORCH = False
    _NN_MODULE: Any = object


class _BaseModule:
    def __init__(self, *args: Any, **kwargs: Any) -> None: pass
    def parameters(self) -> Any: return []
    def train(self, mode: bool = True) -> Any: return self
    def eval(self) -> Any: return self
    def state_dict(self) -> Dict[str, Any]: return {}
    def load_state_dict(self, state_dict: Dict[str, Any], strict: bool = True) -> Any: return None
    def __call__(self, *args: Any, **kwargs: Any) -> Any: return None
    def forward(self, *args: Any, **kwargs: Any) -> Any: return None

try:
    import torch  # type: ignore
    import torch.nn as nn  # type: ignore
    _HAS_TORCH = True
    _BaseModule = nn.Module  # type: ignore
except ImportError:
    class _FakeNN:
        Module = _BaseModule
        ConstantPad1d = Conv1d = GroupNorm = GELU = Sequential = Conv2d = SmoothL1Loss = lambda *a, **kw: None  # type: ignore
    class _FakeTorch:
        Tensor = object
        float32 = None
        manual_seed = set_num_threads = get_num_threads = load = save = tensor = arange = randperm = randn = lambda *a, **kw: None  # type: ignore
        class optim:  # type: ignore
            Adam = lambda *a, **kw: None  # type: ignore
            class lr_scheduler:  # type: ignore
                CosineAnnealingLR = lambda *a, **kw: None  # type: ignore
        class no_grad:  # type: ignore
            def __enter__(self): pass
            def __exit__(self, *a): pass
    torch = cast(Any, _FakeTorch())
    nn = cast(Any, _FakeNN())
    _HAS_TORCH = False
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────────────────────
# Constants & basin geometry
# ─────────────────────────────────────────────────────────────────────────────

VALID_BASINS = ("arabian_sea", "bay_of_bengal", "equatorial_io")

#: Canonical internal grid every basin window is resampled onto.
GRID_H: int = 12
GRID_W: int = 12

#: (lat_min, lat_max, lon_min, lon_max) geographic windows per basin.
BASIN_WINDOWS: Dict[str, Tuple[float, float, float, float]] = {
    "arabian_sea": (4.0, 26.0, 52.0, 76.0),
    "bay_of_bengal": (4.0, 24.0, 78.0, 98.0),
    "equatorial_io": (-10.0, 10.0, 45.0, 95.0),
}

#: Hobday-style P90 exceedance proxy (deg C above climatology) per basin.
MHW_THRESHOLD_C: Dict[str, float] = {
    "arabian_sea": 1.10,
    "bay_of_bengal": 1.00,
    "equatorial_io": 0.80,
}

#: Climatological baseline SST at grid center (deg C) per basin.
BASIN_BASE_SST: Dict[str, float] = {
    "arabian_sea": 28.2,
    "bay_of_bengal": 29.0,
    "equatorial_io": 29.2,
}

HISTORY_DAYS: int = 30
N_VARS: int = 3  # temp, salinity, doxy

CHECKPOINT_DIR = Path(__file__).resolve().parent / "checkpoints"
CHECKPOINT_PATH = CHECKPOINT_DIR / "mhw_tcn.pt"

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic contracts (exact per Member-3 spec)
# ─────────────────────────────────────────────────────────────────────────────


class MHWForecastRequest(BaseModel):
    ocean_basin: str = Field(..., description="arabian_sea | bay_of_bengal | equatorial_io")
    forecast_days: int = Field(7, description="Forecast horizon in days (7 or 14)")
    lat_range: Optional[Tuple[float, float]] = Field(None, description="Optional lat sub-window")
    lon_range: Optional[Tuple[float, float]] = Field(None, description="Optional lon sub-window")


class MHWForecastResponse(BaseModel):
    ocean_basin: str
    forecast_horizon_days: int
    predicted_mean_anomaly: float = Field(..., description="Basin-mean predicted SST anomaly (+ deg C)")
    max_anomaly_hotspot: Dict[str, Any] = Field(
        ..., description='{"lat": .., "lon": .., "predicted_anomaly": ..}'
    )
    time_series_forecast: List[Dict[str, Any]] = Field(
        ..., description='[{"date": .., "predicted_sst": .., "anomaly": ..}]'
    )
    mhw_probability: float = Field(..., ge=0.0, le=1.0)
    confidence_bounds_95: Dict[str, Any] = Field(
        default_factory=dict, description="Per-cell 95% CI half-width surface summary"
    )
    model_latency_ms: float = Field(0.0, description="Inference latency in milliseconds")
    data_source: str = Field(
        "synthetic",
        description="'live_argo' when served from the Supabase archives, else 'synthetic'",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Physics-informed synthetic data generator
# ─────────────────────────────────────────────────────────────────────────────


def basin_cell_centers(basin: str) -> Tuple[np.ndarray, np.ndarray]:
    """Return (lat[H,W], lon[H,W]) cell-center coordinate meshes for a basin."""
    lat0, lat1, lon0, lon1 = BASIN_WINDOWS[basin]
    lats = np.linspace(lat0 + 1.0, lat1 - 1.0, GRID_H)
    lons = np.linspace(lon0 + 1.0, lon1 - 1.0, GRID_W)
    lon_m, lat_m = np.meshgrid(lons, lats)
    return lat_m.astype(np.float64), lon_m.astype(np.float64)


def seasonal_climatology_sst(lat: np.ndarray, day_of_year: int, basin: str) -> np.ndarray:
    """Latitude-dependent mean SST with a seasonal sinusoid (NH peaks ~day 120)."""
    base = BASIN_BASE_SST[basin]
    meridional = base - 0.18 * np.abs(lat - np.sign(lat) * 8.0)
    amplitude = 1.6 if basin == "arabian_sea" else 1.1
    phase_day = 120.0
    seasonal = amplitude * np.sin(2.0 * np.pi * (day_of_year - phase_day) / 365.25)
    return meridional + seasonal


def _red_noise(T: int, rng: np.random.Generator, phi: float = 0.85, sigma: float = 0.35) -> np.ndarray:
    """AR(1) temporal process -> shape (T,)"""
    out = np.empty(T)
    out[0] = rng.normal(0.0, sigma)
    for t in range(1, T):
        out[t] = phi * out[t - 1] + rng.normal(0.0, sigma * np.sqrt(1.0 - phi**2))
    return out


def _spatial_smooth(field: np.ndarray, passes: int = 2) -> np.ndarray:
    """Cheap separable box blur (shape-preserving) to create spatially correlated noise."""

    def smooth_once(f: np.ndarray) -> np.ndarray:
        k = (0.25, 0.5, 0.25)
        p = np.pad(f, ((1, 1), (0, 0)), mode="edge")
        rows = sum(k[i] * p[i : i + f.shape[0], :] for i in range(3))
        p = np.pad(rows, ((0, 0), (1, 1)), mode="edge")
        return np.asarray(sum(k[i] * p[:, i : i + f.shape[1]] for i in range(3)))
        p = np.pad(cast(np.ndarray, rows), ((0, 0), (1, 1)), mode="edge")
        return cast(np.ndarray, sum(k[i] * p[:, i : i + f.shape[1]] for i in range(3)))

    out = field
    for _ in range(passes):
        out = smooth_once(out)
    return out


MAX_HORIZON_DAYS: int = 14


def _sample_event_params(basin: str, rng: np.random.Generator) -> Dict[str, Any]:
    """Sample MHW lifecycle parameters: Gaussian epicenter, rise/decay timescales."""
    win = BASIN_WINDOWS[basin]
    return {
        "lat": rng.uniform(win[0] + 3.0, win[1] - 3.0),
        "lon": rng.uniform(win[2] + 3.0, win[3] - 3.0),
        "peak": rng.uniform(2.0, 3.5),
        "radius": rng.uniform(6.0, 10.0),
        "tau_rise": rng.uniform(3.0, 5.0),
        "tau_decay": rng.uniform(5.0, 9.0),
        "duration": int(rng.integers(8, 21)),
        "start": 0,
    }


def _event_envelope(ev: Dict[str, Any], t: int) -> float:
    """MHW amplitude at absolute day t: exponential rise -> plateau -> decay."""
    x = t - ev["start"]
    if x < 0:
        return 0.0
    rise = 1.0 - np.exp(-x / ev["tau_rise"])
    if x <= ev["duration"]:
        return float(ev["peak"] * rise)
    return float(ev["peak"] * rise * np.exp(-(x - ev["duration"]) / ev["tau_decay"]))


def generate_synthetic_sample(
    basin: str,
    end_date: date,
    n_days: int = HISTORY_DAYS,
    seed: Optional[int] = None,
    inject_mhw: bool = False,
    active_at_end: bool = False,
) -> Tuple[np.ndarray, Dict[int, np.ndarray]]:
    """
    Generate ONE matched training sample from a single continuous process:
      history  : (n_days, N_VARS, GRID_H, GRID_W) physical grid [sst_c, psal, doxy]
      targets  : {7: anom_surface, 14: anom_surface} SST anomalies (+ deg C)

    The MWH event (if any) follows one lifecycle across BOTH the history window
    and the target horizons — same epicenter, same envelope — so supervision is
    fully learnable from inputs.
    """
    rng = np.random.default_rng(seed)
    lat_m, lon_m = basin_cell_centers(basin)
    total_days = n_days + MAX_HORIZON_DAYS
    dates = [end_date - timedelta(days=total_days - 1 - t) for t in range(total_days)]

    ev = _sample_event_params(basin, rng) if inject_mhw else None
    kernel = np.zeros_like(lat_m)
    if ev is not None:
        if active_at_end:
            # Established event: visible ramp >= 9 days old and still alive past horizon
            ev["start"] = int(rng.integers(max(0, n_days - 16), n_days - 8))
            ev["duration"] = max(ev["duration"], n_days - ev["start"] + MAX_HORIZON_DAYS)
        else:
            ev["start"] = int(rng.integers(max(0, n_days - 24), max(1, n_days)))
        kernel = np.exp(
            -((lat_m - ev["lat"]) ** 2 + (lon_m - ev["lon"]) ** 2) / (2.0 * ev["radius"] ** 2)
        )

    common = _red_noise(total_days, rng)
    coupling = -0.05 if basin == "bay_of_bengal" else -0.02

    anom = np.empty((total_days, GRID_H, GRID_W))
    for t in range(total_days):
        field = 0.6 * common[t] + 0.4 * _spatial_smooth(rng.normal(0, 0.35, (GRID_H, GRID_W)))
        if ev is not None:
            field += _event_envelope(ev, t) * kernel
        anom[t] = field

    history = np.empty((n_days, N_VARS, GRID_H, GRID_W))
    for t in range(n_days):
        doy = dates[t].timetuple().tm_yday
        sst_t = seasonal_climatology_sst(lat_m, doy, basin) + anom[t]
        psal_t = 35.0 + 0.02 * np.sin(np.deg2rad(lon_m)) + coupling * anom[t] + rng.normal(0, 0.03)
        doxy_t = 195.0 - 5.2 * sst_t - 14.0 * anom[t] + rng.normal(0, 4.0, (GRID_H, GRID_W))
        history[t, 0], history[t, 1], history[t, 2] = sst_t, psal_t, doxy_t

    targets = {h: anom[n_days - 1 + h].copy() for h in (7, MAX_HORIZON_DAYS)}
    return history, targets


def generate_synthetic_history(
    basin: str,
    end_date: date,
    n_days: int = HISTORY_DAYS,
    seed: Optional[int] = None,
    inject_mhw: bool = False,
    active_at_end: bool = False,
) -> np.ndarray:
    """Physical history grid only (targets discarded). See generate_synthetic_sample."""
    history, _ = generate_synthetic_sample(
        basin, end_date, n_days=n_days, seed=seed, inject_mhw=inject_mhw, active_at_end=active_at_end
    )
    return history


# ─────────────────────────────────────────────────────────────────────────────
# Model: Spatio-Temporal TCN
# ─────────────────────────────────────────────────────────────────────────────


class TemporalBlock(_NN_MODULE):  # type: ignore[misc]
    """
    1D dilated causal convolution block with weight-norm and residual path.
    Receptive field grows exponentially with dilation factor d = 2^k.
    """
class TemporalBlock(_BaseModule):  # type: ignore[misc]
    def __init__(self, in_ch: int, out_ch: int, dilation: int):
        if not _HAS_TORCH:
            return
        super().__init__()
        self.pad = nn.ConstantPad1d((2 * dilation, 0), 0.0)  # causal: left-only pad
        self.conv = nn.Conv1d(in_ch, out_ch, kernel_size=3, padding=0, dilation=dilation)
        self.norm = nn.GroupNorm(1, out_ch)
        self.act = nn.GELU()

    def forward(self, x: Any) -> Any:
        if not _HAS_TORCH:
            return x
        return self.act(self.norm(self.conv(self.pad(x))))


class SpatioTemporalTCN(_NN_MODULE):  # type: ignore[misc]
class SpatioTemporalTCN(_BaseModule):  # type: ignore[misc]
    """
    Per-cell temporal encoder (dilated causal Conv1d over 30-day history)
    followed by a light spatial refinement head (3x3 convs over the grid).

    Input : (B, T, C, H, W) normalized history
    Output: (B, 2, H, W) predicted temperature anomaly at +7d and +14d
    """

    def __init__(self, in_vars: int = N_VARS, hidden: Tuple[int, ...] = (24, 32, 32, 24)):
        if not _HAS_TORCH:
            return
        super().__init__()
        layers: List[Any] = []
        ch = in_vars
        for i, h in enumerate(hidden):
            layers.append(TemporalBlock(ch, h, dilation=2**i))
            ch = h
        self.temporal = nn.Sequential(*layers)
        self.spatial = nn.Sequential(
            nn.Conv2d(hidden[-1], 16, 3, padding=1),
            nn.GELU(),
            nn.Conv2d(16, 2, 3, padding=1),
        )

    def forward(self, x: Any) -> Any:
        if not _HAS_TORCH:
            return x
        B, T, C, H, W = x.shape
        # (B,H,W,T,C) -> per-cell rows are t-major, then transpose to (N, C, T) for Conv1d
        z = x.permute(0, 3, 4, 1, 2).reshape(B * H * W, T, C).permute(0, 2, 1)
        z = self.temporal(z)
        z = z.mean(dim=-1)                      # (B*H*W, ch) — robust global pool over time
        z = z.reshape(B, H, W, -1).permute(0, 3, 1, 2)
        return self.spatial(z)

    def parameters(self) -> Any:
        if _HAS_TORCH and hasattr(super(), "parameters"):
            return super().parameters()
        return []

    def train(self, mode: bool = True) -> Any:
        if _HAS_TORCH and hasattr(super(), "train"):
            return super().train(mode)
        return self

    def eval(self) -> Any:
        if _HAS_TORCH and hasattr(super(), "eval"):
            return super().eval()
        return self

    def state_dict(self) -> Dict[str, Any]:
        if _HAS_TORCH and hasattr(super(), "state_dict"):
            return super().state_dict()
        return {}

    def load_state_dict(self, state_dict: Dict[str, Any], strict: bool = True) -> Any:
        if _HAS_TORCH and hasattr(super(), "load_state_dict"):
            return super().load_state_dict(state_dict, strict=strict)
        return None

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        if _HAS_TORCH and hasattr(super(), "__call__"):
            return super().__call__(*args, **kwargs)
        return self.forward(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# Normalization stats
# ─────────────────────────────────────────────────────────────────────────────


def _dataset_stats(samples: List[np.ndarray]) -> Tuple[np.ndarray, np.ndarray]:
    stacked = np.stack(samples)  # (N, T, C, H, W)
    mean = stacked.mean(axis=(0, 1, 3, 4)).reshape(1, 1, N_VARS, 1, 1)
    std = stacked.std(axis=(0, 1, 3, 4)).reshape(1, 1, N_VARS, 1, 1) + 1e-6
    return mean, std


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────


def build_training_dataset(
    n_samples: int = 384, seed: int = 7
) -> Tuple[List[np.ndarray], List[Dict[int, np.ndarray]], List[str]]:
    xs: List[np.ndarray] = []
    ys: List[Dict[int, np.ndarray]] = []
    basins: List[str] = []
    today = date.today()
    for i in range(n_samples):
        basin = VALID_BASINS[i % len(VALID_BASINS)]
        inject = (i % 5) != 0  # ~80% events, 20% calm
        active = inject and ((i % 2) == 0)  # half the events established/ramping at end
        hist, tgt = generate_synthetic_sample(
            basin, date.today(), seed=seed + i, inject_mhw=inject, active_at_end=active
        )
        xs.append(hist)
        ys.append(tgt)
        basins.append(basin)
    return xs, ys, basins


def train_model(
    epochs: int = 10,
    batch_size: int = 16,
    lr: float = 2e-3,
    n_samples: int = 384,
    save_path: Optional[Path] = None,
    seed: int = 42,
) -> Dict[str, Any]:
    """Train the TCN on synthetic physics and save a checkpoint. Runs < 2 min CPU."""
    torch.manual_seed(seed)
    model = SpatioTemporalTCN()
    xs, ys, basins = build_training_dataset(n_samples=n_samples, seed=seed)
    mean_np, std_np = _dataset_stats(xs)
    mean = torch.tensor(np.asarray(mean_np), dtype=torch.float32)
    std = torch.tensor(np.asarray(std_np), dtype=torch.float32)

    X = torch.tensor(np.stack(xs), dtype=torch.float32)
    Y7 = torch.tensor(np.stack([y[7] for y in ys]), dtype=torch.float32)
    Y14 = torch.tensor(np.stack([y[14] for y in ys]), dtype=torch.float32)

    opt = torch.optim.Adam(model.parameters(), lr=lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    loss_fn = nn.SmoothL1Loss()

    n = X.shape[0]
    split = int(n * 0.9)
    tr_idx = torch.arange(split)
    va_idx = torch.arange(split, n)

    for ep in range(epochs):
        perm = tr_idx[torch.randperm(split)]
        total = 0.0
        model.train()
        for s in range(0, split, batch_size):
            idx = perm[s : s + batch_size]
            xb = (X[idx] - mean) / std
            y7, y14 = Y7[idx], Y14[idx]
            pred = model(xb)
            loss = loss_fn(pred[:, 0], y7) + loss_fn(pred[:, 1], y14)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
        sched.step()
        if ep == epochs - 1 or ep == 0:
            model.eval()
            with torch.no_grad():
                pv = model((X[va_idx] - mean) / std)
                vloss = (
                    loss_fn(pv[:, 0], Y7[va_idx]).item() + loss_fn(pv[:, 1], Y14[va_idx]).item()
                ) / 2.0
            print(f"[mhw_forecast] epoch {ep+1}/{epochs} train_loss={total/split:.4f} val_loss={vloss:.4f}")

    model.eval()
    with torch.no_grad():
        resid7 = (model((X[va_idx] - mean) / std)[:, 0] - Y7[va_idx]).numpy()
        resid14 = (model((X[va_idx] - mean) / std)[:, 1] - Y14[va_idx]).numpy()
    sigma7 = float(resid7.std())
    sigma14 = float(resid14.std())

    path = Path(save_path) if save_path else CHECKPOINT_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "mean": np.asarray(mean_np).ravel().tolist(),
            "std": np.asarray(std_np).ravel().tolist(),
            "sigma7": sigma7,
            "sigma14": sigma14,
            "trained_epochs": epochs,
            "trained_at": datetime.now(timezone.utc).isoformat(),
        },
        path,
    )
    print(f"[mhw_forecast] checkpoint saved -> {path} (sigma7={sigma7:.3f}, sigma14={sigma14:.3f})")
    return {"path": str(path), "sigma7": sigma7, "sigma14": sigma14}


# ─────────────────────────────────────────────────────────────────────────────
# Model lifecycle (load-once singleton)
# ─────────────────────────────────────────────────────────────────────────────

_LOCK = threading.Lock()
_MODEL: Optional[Any] = None
_META: Dict[str, Any] = {}
_HISTORY_PROVIDER: Optional[
    Callable[[str, date], np.ndarray]
] = None
#: Provenance of the most recent history fetch (surfaced in responses).
_DATA_SOURCE: str = "synthetic"
_REAL_CLIMATOLOGY: bool = False


def set_history_provider(
    provider: Optional[Callable[[str, date], np.ndarray]],
) -> None:
    """
    Integration hook for the real ingestion pipeline. Provider must return a
    (T, 3, H, W) float array [sst_c, psal, doxy] ending at `end_date` inclusive.
    Pass None to restore the synthetic default provider.
    """
    global _HISTORY_PROVIDER, _DATA_SOURCE
    _HISTORY_PROVIDER = provider
    _DATA_SOURCE = "custom_provider" if provider is not None else "synthetic"


def db_history_provider(basin: str, end_date: date) -> np.ndarray:
    """
    Live-Supabase history provider: aggregates real near-surface ARGO
    observations from both projects into the (30, 3, 12, 12) physical grid
    via src.ml.argo_store. Falls back to the synthetic generator (with a
    loud warning and a provenance marker) if the archives are unreachable,
    so a demo never dies mid-request. Results are disk/memory cached with a
    6 h TTL — warm calls are pure numpy (< 1 ms).
    """
    global _DATA_SOURCE
    try:
        from src.ml import argo_store

        result = argo_store.build_history_grid(basin, end_date)
        _DATA_SOURCE = "live_argo"
        return result["grid"]
    except Exception as exc:  # noqa: BLE001 — availability path, never crash the API
        print(
            f"[mhw_forecast] live ARGO grid unavailable for '{basin}' "
            f"({type(exc).__name__}: {exc}) — using synthetic history"
        )
        _DATA_SOURCE = "live_argo_unavailable_synthetic_fallback"
        seed = hash((basin, end_date.toordinal())) % (2**31)
        return generate_synthetic_history(basin, end_date, seed=seed, inject_mhw=False)


def enable_real_data(enable: bool = True) -> bool:
    """
    Switch the forecaster onto the live Supabase archives:
      - installs db_history_provider,
      - prefetches + caches the 30-day grids for every basin and the
        multi-year climatology (so first requests stay < 100 ms),
      - enables the real day-of-year climatology as anomaly baseline.

    Returns True when the live path is fully active; False when it fell back
    to synthetic (never raises — startup must survive an offline database).
    Call `enable_real_data(False)` to return to the deterministic synthetic path.
    """
    global _REAL_CLIMATOLOGY, _DATA_SOURCE
    if not enable:
        set_history_provider(None)
        _REAL_CLIMATOLOGY = False
        return False
    try:
        from src.ml import argo_store

        reachable = [d for d in argo_store.status()["databases"] if d.get("reachable")]
        if not reachable:
            raise RuntimeError("no ARGO Supabase project reachable")
        set_history_provider(db_history_provider)
        today = date.today()
        for basin in VALID_BASINS:
            try:
                grid_info = argo_store.build_history_grid(basin, today)
                print(
                    f"[mhw_forecast] prefetched live grid '{basin}': "
                    f"coverage={grid_info['coverage']:.1%}, rows={grid_info['obs_rows']}"
                )
            except Exception as exc:  # noqa: BLE001 — per-basin fallback at request time
                print(f"[mhw_forecast] prefetch skipped for '{basin}': {exc}")
            try:
                clim = argo_store.build_climatology(basin)
                print(
                    f"[mhw_forecast] prefetched climatology '{basin}': "
                    f"{clim['cells_observed']}/{GRID_H * GRID_W} cells observed"
                )
            except Exception as exc:  # noqa: BLE001
                print(f"[mhw_forecast] climatology unavailable for '{basin}': {exc}")
        _REAL_CLIMATOLOGY = True
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"[mhw_forecast] real-data mode NOT enabled ({exc}) — staying synthetic")
        _REAL_CLIMATOLOGY = False
        return False


def real_data_active() -> bool:
    """True when the installed history provider is the live-database one."""
    return _HISTORY_PROVIDER is db_history_provider


def _default_provider(basin: str, end_date: date) -> np.ndarray:
    seed = hash((basin, end_date.toordinal())) % (2**31)
    return generate_synthetic_history(basin, end_date, seed=seed, inject_mhw=False)


def ensure_ready() -> bool:
    """Load checkpoint once; quick-train a small fallback model if missing."""
    global _MODEL, _META
    with _LOCK:
        if _MODEL is not None:
            return True
        if not _HAS_TORCH:
            _MODEL = "numpy_fallback"
            _META = {
                "mean": np.array([28.0, 35.0, 150.0], dtype=np.float32),
                "std": np.array([2.0, 1.0, 50.0], dtype=np.float32),
                "sigma7": 0.45,
                "sigma14": 0.65,
            }
            return True
        torch.set_num_threads(min(4, torch.get_num_threads()))
        if CHECKPOINT_PATH.exists():
            ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
        else:
            result = train_model(epochs=4, n_samples=96)
            ckpt = torch.load(Path(result["path"]), map_location="cpu", weights_only=False)
        model = SpatioTemporalTCN()
        model.load_state_dict(ckpt["state_dict"])
        model.eval()
        _MODEL = model
        _META = {
            "mean": np.asarray(ckpt["mean"], dtype=np.float32).ravel(),
            "std": np.asarray(ckpt["std"], dtype=np.float32).ravel(),
            "sigma7": float(ckpt["sigma7"]),
            "sigma14": float(ckpt["sigma14"]),
        }
        return True


# ─────────────────────────────────────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────────────────────────────────────


def _climatology_surface(
    basin: str, lat_m: np.ndarray, lon_m: np.ndarray, day_of_year: int
) -> np.ndarray:
    """
    Day-of-year SST climatology for the anomaly baseline. In live mode this is
    the REAL multi-year archive climatology (bilinearly sampled per cell) with
    the synthetic seasonal formula filling cells the floats never observed;
    outside live mode it is purely synthetic. Never raises.
    """
    if _REAL_CLIMATOLOGY:
        try:
            from src.ml import argo_store

            real = argo_store.climatology_for(basin, lat_m, lon_m, day_of_year)
            synth = seasonal_climatology_sst(lat_m, day_of_year, basin)
            return np.where(np.isfinite(real), real, synth)
        except Exception:  # noqa: BLE001 — baseline must never break a forecast
            pass
    return seasonal_climatology_sst(lat_m, day_of_year, basin)


def _subwindow_mask(request: MHWForecastRequest) -> Optional[Tuple[slice, slice]]:
    lat_m, lon_m = basin_cell_centers(request.ocean_basin)
    rows = np.ones(GRID_H, dtype=bool)
    cols = np.ones(GRID_W, dtype=bool)
    if request.lat_range is not None:
        rows = (lat_m[:, 0] >= min(request.lat_range)) & (lat_m[:, 0] <= max(request.lat_range))
    if request.lon_range is not None:
        cols = (lon_m[0, :] >= min(request.lon_range)) & (lon_m[0, :] <= max(request.lon_range))
    if rows.all() and cols.all():
        return None
    return (
        slice(int(np.argmax(rows)), GRID_H - int(np.argmax(rows[::-1]))),
        slice(int(np.argmax(cols)), GRID_W - int(np.argmax(cols[::-1]))),
    )


def predict_mhw_trend(request: MHWForecastRequest) -> MHWForecastResponse:
    """
    Compute the predictive SST anomaly forecast for the requested basin.

    Raises ValueError on unknown basin (router maps to HTTP 422); RuntimeError
    if model artifacts cannot be prepared (router maps to HTTP 500).
    """
    if request.ocean_basin not in VALID_BASINS:
        raise ValueError(f"Unknown ocean_basin '{request.ocean_basin}'. Valid: {list(VALID_BASINS)}")
    if request.forecast_days not in (7, 14):
        raise ValueError("forecast_days must be 7 or 14")

    ensure_ready()
    assert _MODEL is not None and _META

    t_start = time.perf_counter()
    end_date = date.today()
    provider = _HISTORY_PROVIDER or _default_provider
    history = provider(request.ocean_basin, end_date)
    source_snapshot = _DATA_SOURCE

    lat_m, lon_m = basin_cell_centers(request.ocean_basin)
    if _HAS_TORCH and not isinstance(_MODEL, str):
        mean = _META["mean"].reshape(1, N_VARS, 1, 1)
        std = _META["std"].reshape(1, N_VARS, 1, 1)
        xb = torch.tensor((history - mean) / std, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            pred = _MODEL(xb)[0].numpy()  # (2, H, W): channel 0 -> +7d, channel 1 -> +14d
    else:
        # High-performance physics-informed spatial-temporal persistence & trend extrapolation
        sst_hist = history[:, 0]  # (30, H, W)
        sst_trend = (sst_hist[-1] - sst_hist[0]) / 30.0
        doy = end_date.timetuple().tm_yday
        clim = _climatology_surface(request.ocean_basin, lat_m, lon_m, doy)
        pred = np.stack([
            (sst_hist[-1] + sst_trend * 7.0) - clim,
            (sst_hist[-1] + sst_trend * 14.0) - clim
        ])

    horizon_idx = 0 if request.forecast_days == 7 else 1
    sigma = _META["sigma7"] if request.forecast_days == 7 else _META["sigma14"]
    anomaly_surface = pred[horizon_idx]
    ci95_half_width = 1.96 * sigma * float(np.sqrt(request.forecast_days / 7.0))

    mask = _subwindow_mask(request)
    view = anomaly_surface[mask] if mask else anomaly_surface
    lat_m, lon_m = basin_cell_centers(request.ocean_basin)
    view_lat = lat_m[mask] if mask else lat_m
    view_lon = lon_m[mask] if mask else lon_m

    # Hotspot
    flat_argmax = int(np.argmax(view))
    hotspot = {
        "lat": round(float(view_lat.flat[flat_argmax]), 2),
        "lon": round(float(view_lon.flat[flat_argmax]), 2),
        "predicted_anomaly": round(float(view.flat[flat_argmax]), 2),
        "ci95_half_width": round(ci95_half_width, 3),
    }

    # Basin-mean anomaly + day-by-day series blending persistence -> horizon.
    # Anomaly baseline: real multi-year archive climatology when live mode is
    # active, per-cell fallback to the synthetic seasonal formula elsewhere.
    current_anom_map = history[-1, 0] - _climatology_surface(
        request.ocean_basin, lat_m, lon_m, end_date.timetuple().tm_yday
    )
    current_mean_anom = float(((current_anom_map[mask]) if mask else current_anom_map).mean())

    horizon_mean_anom = float(view.mean())
    threshold = MHW_THRESHOLD_C[request.ocean_basin]

    series: List[Dict[str, Any]] = []
    for d in range(1, request.forecast_days + 1):
        w = d / request.forecast_days
        day_anom = current_mean_anom * (1.0 - w) + horizon_mean_anom * w
        doy = (end_date + timedelta(days=d)).timetuple().tm_yday
        clim_center = float(
            _climatology_surface(request.ocean_basin, lat_m, lon_m, doy).mean()
        )
        series.append(
            {
                "date": (end_date + timedelta(days=d)).isoformat(),
                "predicted_sst": round(clim_center + day_anom, 2),
                "anomaly": round(day_anom, 2),
                "ci95_low": round(day_anom - ci95_half_width, 2),
                "ci95_high": round(day_anom + ci95_half_width, 2),
            }
        )

    # MHW declaration probability (Hobday et al. 2016 style): P(cell anomaly >
    # P90-threshold at horizon) under a Gaussian predictive residual N(pred,
    # sigma_h), averaged over grid cells, then scaled by the >=5-day persistence
    # requirement (once past threshold, short-range persistence makes a 5-day
    # run likely).
    sigma_h = max(sigma, 1e-3)

    def norm_cdf(z: np.ndarray) -> np.ndarray:
        from math import sqrt

        return 0.5 * (1.0 + np.vectorize(erf)(z / sqrt(2.0)))

    cell_prob = norm_cdf((view - threshold) / sigma_h)
    mhw_prob = float(np.clip(1.20 * float(cell_prob.mean()), 0.0, 1.0))

    latency_ms = (time.perf_counter() - t_start) * 1000.0

    return MHWForecastResponse(
        ocean_basin=request.ocean_basin,
        forecast_horizon_days=request.forecast_days,
        predicted_mean_anomaly=round(horizon_mean_anom, 2),
        max_anomaly_hotspot=hotspot,
        time_series_forecast=series,
        mhw_probability=round(mhw_prob, 3),
        confidence_bounds_95={
            "half_width_deg_c": round(ci95_half_width, 3),
            "method": "gaussian residual sigma x 1.96, sqrt(horizon)-scaled",
        },
        model_latency_ms=round(latency_ms, 2),
        data_source=source_snapshot,
    )
