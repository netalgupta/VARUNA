"""
FloatChat AI — Visualization Spec Builder

Builds chart/map specs from SQL result rows that the frontend
consumes to render the appropriate Plotly chart or Leaflet map.

WHY return specs instead of actual charts?
  The backend is Python, frontend is TypeScript/React. Sending a JSON
  "spec" (what type of chart, what data) is cleaner than sending SVG/HTML.
  The frontend's ChartRouter decides which Plotly component to render.

Chart type selection logic:
  - has pres (depth) + temp/psal/doxy → DepthProfile
  - has time + single numeric variable → TimeSeries
  - has month aggregation → SeasonalBoxplots or Hovmöller
  - has latitude + longitude → map points
  - has temp + psal → TSIsopycnals
  - multi-float comparison → grouped time series
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from itertools import islice


def build_viz_specs(
    rows: List[Dict[str, Any]],
    question: str = "",
) -> Dict[str, Any]:
    """
    Analyze rows and build frontend-consumable viz specs.
    Returns a dict with keys: chart_type, chart_data, map_data.
    """
    if not rows:
        return {"chart_type": None, "chart_data": None, "map_data": None}

    # Normalize cross-domain / alias keys
    norm_rows = []
    for r in rows:
        nr = dict(r)
        if "water_temp_c" in nr and "temp" not in nr:
            nr["temp"] = nr["water_temp_c"]
        if "dissolved_oxygen_umol_kg" in nr and "doxy" not in nr:
            nr["doxy"] = nr["dissolved_oxygen_umol_kg"]
        if "salinity_psu" in nr and "psal" not in nr:
            nr["psal"] = nr["salinity_psu"]
        if "maximum_depth_m" in nr and "pres" not in nr:
            nr["pres"] = nr["maximum_depth_m"]
        if "argo_float_id" in nr and "platform_number" not in nr:
            nr["platform_number"] = nr["argo_float_id"]
        if "argo_obs_time" in nr and "time" not in nr:
            nr["time"] = nr["argo_obs_time"]
        norm_rows.append(nr)
    rows = norm_rows

    cols = set(rows[0].keys())
    q = question.lower()

    # ── Map points (always include if lat/lon present) ─────────────────────
    map_data = None
    if "latitude" in cols and "longitude" in cols:
        points = []
        for r in islice(rows, 300):
            lat = r.get("latitude") or r.get("lat") or r.get("decimal_latitude")
            lon = r.get("longitude") or r.get("lon") or r.get("decimal_longitude")
            if lat is None or lon is None:
                continue
            points.append({
                "lat": float(lat), "lon": float(lon),
                "id": str(r.get("platform_number", "")),
                "label": _row_label(r),
                "temp": r.get("temp"), "psal": r.get("psal"),
                "doxy": r.get("doxy"), "chla": r.get("chla"),
            })
        if points:
            center_lat = sum(p["lat"] for p in points) / len(points)
            center_lon = sum(p["lon"] for p in points) / len(points)
            map_data = {"center": [center_lat, center_lon], "zoom": 5, "points": points}

    # ── Chart type detection ────────────────────────────────────────────────
    chart_type = None
    chart_data = None

    has_depth   = "depth_m" in cols or "pres" in cols
    has_time    = "time" in cols or "month" in cols
    has_temp    = "temp" in cols and any(r.get("temp") is not None for r in rows)
    has_psal    = "psal" in cols and any(r.get("psal") is not None for r in rows)
    has_doxy    = "doxy" in cols and any(r.get("doxy") is not None for r in rows)
    has_chla    = "chla" in cols and any(r.get("chla") is not None for r in rows)
    has_nitrate = "nitrate" in cols and any(r.get("nitrate") is not None for r in rows)
    has_month   = "month" in cols
    multi_float = len({r.get("platform_number") for r in rows if r.get("platform_number")}) > 1

    if has_depth and (has_temp or has_psal or has_doxy):
        chart_type = "depth_profile"
        chart_data = _depth_profile_data(rows)

    elif has_temp and has_psal and not has_depth:
        chart_type = "ts_isopycnals"
        chart_data = _ts_data(rows)

    elif has_month and (has_temp or has_psal or has_doxy or has_chla):
        chart_type = "seasonal_boxplots"
        chart_data = _seasonal_data(rows)

    elif has_time and has_chla and has_nitrate:
        chart_type = "chla_nitrate_scatter"
        chart_data = _xy_scatter(rows, "chla", "nitrate")

    elif has_time and has_temp and not has_depth:
        chart_type = "time_series"
        chart_data = _time_series_data(rows, ["temp", "psal", "doxy", "chla"])

    elif has_time and (has_doxy or has_chla):
        chart_type = "time_series"
        chart_data = _time_series_data(rows, ["doxy", "chla", "nitrate"])

    return {
        "chart_type": chart_type,
        "chart_data": chart_data,
        "map_data": map_data,
    }


def _row_label(r: Dict[str, Any]) -> str:
    parts = []
    if r.get("platform_number"):
        parts.append(f"Float {r['platform_number']}")
    if r.get("time"):
        parts.append("".join(islice(str(r["time"]), 10)))
    return " · ".join(parts) if parts else "Float"


def _depth_profile_data(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Group by platform_number for multi-float profiles."""
    profiles: Dict[str, List] = {}
    for r in rows:
        pid = str(r.get("platform_number", "unknown"))
        depth_key = "depth_m" if "depth_m" in r else "pres"
        if pid not in profiles:
            profiles[pid] = []
        profiles[pid].append({
            "depth": r.get(depth_key),
            "temp": r.get("temp"), "psal": r.get("psal"),
            "doxy": r.get("doxy"), "chla": r.get("chla"),
        })
    return {"profiles": profiles}


def _ts_data(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "temp": [r.get("temp") for r in rows],
        "psal": [r.get("psal") for r in rows],
        "lat":  [r.get("latitude") for r in rows],
        "lon":  [r.get("longitude") for r in rows],
    }


def _seasonal_data(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "months": ["".join(islice(str(r.get("month", "")), 7)) for r in rows],
        "temp":   [r.get("temp") or r.get("avg_temp") for r in rows],
        "psal":   [r.get("psal") or r.get("avg_psal") for r in rows],
        "doxy":   [r.get("doxy") or r.get("avg_doxy") for r in rows],
        "chla":   [r.get("chla") or r.get("avg_chla") for r in rows],
    }


def _time_series_data(rows: List[Dict[str, Any]], vars: List[str]) -> Dict[str, Any]:
    times = ["".join(islice(str(r.get("time", "")), 19)) for r in rows]
    series = {}
    for v in vars:
        vals = [r.get(v) or r.get(f"avg_{v}") for r in rows]
        if any(x is not None for x in vals):
            series[v] = vals
    return {"times": times, "series": series}


def _xy_scatter(rows: List[Dict[str, Any]], x_var: str, y_var: str) -> Dict[str, Any]:
    return {
        "x": [r.get(x_var) for r in rows],
        "y": [r.get(y_var) for r in rows],
        "x_label": x_var, "y_label": y_var,
        "platform": [str(r.get("platform_number", "")) for r in rows],
    }
