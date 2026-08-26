"""
VARUNA — Biodiversity Sub-Agent
Queries public.marine_biodiversity (CMLRE occurrences) for spatial co-location
with physical ARGO telemetry, and retrieves ecological profiles from Qdrant bio_knowledge.
"""
from __future__ import annotations

import asyncio
import logging
import time as _time
from typing import Any, Dict, List, Optional

from src.database.qdrant import search_similar

log = logging.getLogger("varuna.agent.biodiversity")

# ── Cross-Domain ARGO ↔ CMLRE Spatial Join SQL Templates ─────────────────────

# Template 1: Species near low-oxygen ARGO floats (OMZ habitat compression)
_SQL_OMZ_SPECIES = """
SELECT DISTINCT ON (b.scientific_name)
    b.scientific_name, b.family, b.habitat_zone,
    b.minimum_depth_m, b.maximum_depth_m,
    m.platform_number AS argo_float_id,
    m.time  AS argo_obs_time,
    ROUND(m.temp::numeric, 2) AS water_temp_c,
    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg,
    ROUND(m.psal::numeric, 3) AS salinity_psu,
    ROUND((ST_Distance(b.geom::geography, m.geom::geography) / 1000.0)::numeric, 1) AS dist_km
FROM public.marine_biodiversity b
JOIN public.marine_data m
  ON ST_DWithin(b.geom::geography, m.geom::geography, 50000)
 AND ABS(EXTRACT(EPOCH FROM (b.event_date - m.time))) <= 7 * 86400
WHERE m.doxy IS NOT NULL AND m.doxy < {doxy_threshold}
  AND m.pres <= 200
ORDER BY b.scientific_name, dist_km ASC
LIMIT 20;
"""

# Template 2: Species at thermal stress (SST > threshold)
_SQL_THERMAL_STRESS = """
SELECT DISTINCT ON (b.scientific_name)
    b.scientific_name, b.family, b.habitat_zone,
    b.minimum_depth_m, b.maximum_depth_m,
    m.platform_number AS argo_float_id,
    m.time  AS argo_obs_time,
    ROUND(m.temp::numeric, 2) AS water_temp_c,
    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg,
    ROUND((ST_Distance(b.geom::geography, m.geom::geography) / 1000.0)::numeric, 1) AS dist_km
FROM public.marine_biodiversity b
JOIN public.marine_data m
  ON ST_DWithin(b.geom::geography, m.geom::geography, 50000)
 AND ABS(EXTRACT(EPOCH FROM (b.event_date - m.time))) <= 7 * 86400
WHERE m.temp IS NOT NULL AND m.temp > {temp_threshold}
  AND m.pres <= 10
ORDER BY b.scientific_name, dist_km ASC
LIMIT 20;
"""

# Template 3: Basin-specific species occurrence lookup
_SQL_BASIN_SPECIES = """
SELECT b.scientific_name, b.family, b.genus,
       b.habitat_zone, b.minimum_depth_m, b.maximum_depth_m,
       b.event_date, b.decimal_latitude AS lat, b.decimal_longitude AS lon,
       b.basis_of_record
FROM public.marine_biodiversity b
WHERE b.decimal_latitude  BETWEEN {lat_min} AND {lat_max}
  AND b.decimal_longitude BETWEEN {lon_min} AND {lon_max}
ORDER BY b.event_date DESC NULLS LAST
LIMIT 30;
"""

# Template 4: Named species occurrence history
_SQL_SPECIES_LOOKUP = """
SELECT b.scientific_name, b.family, b.genus,
       b.habitat_zone, b.event_date,
       b.decimal_latitude AS lat, b.decimal_longitude AS lon,
       b.minimum_depth_m, b.maximum_depth_m,
       b.basis_of_record, b.occurrence_status
FROM public.marine_biodiversity b
WHERE b.scientific_name ILIKE '%{species_term}%'
   OR b.family ILIKE '%{species_term}%'
   OR b.genus  ILIKE '%{species_term}%'
ORDER BY b.event_date DESC NULLS LAST
LIMIT 25;
"""


def _pick_sql_template(task_desc: str, params: Dict[str, Any]) -> str:
    """Choose and fill the right SQL template based on task intent."""
    q = (task_desc + " " + params.get("query", "")).lower()

    # OMZ / low oxygen / hypoxia / habitat compression
    if any(kw in q for kw in ["omz", "hypox", "low oxygen", "doxy", "oxygen", "habitat compression"]):
        threshold = params.get("doxy_threshold", 60.0)
        return _SQL_OMZ_SPECIES.format(doxy_threshold=threshold)

    # Thermal stress / bleaching / MHW
    if any(kw in q for kw in ["thermal", "bleach", "mhw", "heat", "temperature stress", "sst"]):
        threshold = params.get("temp_threshold", 28.5)
        return _SQL_THERMAL_STRESS.format(temp_threshold=threshold)

    # Named species lookup
    species = params.get("species", "")
    if species and len(species) > 2:
        safe_species = species.replace("'", "''")[:50]
        return _SQL_SPECIES_LOOKUP.format(species_term=safe_species)

    # Basin-based lookup — use bounding box from params or default to Arabian Sea
    lat_min = params.get("lat_min", 8.0)
    lat_max = params.get("lat_max", 25.0)
    lon_min = params.get("lon_min", 55.0)
    lon_max = params.get("lon_max", 77.0)
    return _SQL_BASIN_SPECIES.format(lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max)


async def execute_biodiversity_task(
    task_desc: str,
    params: Optional[Dict[str, Any]] = None,
    trace: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Biodiversity sub-agent:
    1. Runs a cross-domain PostGIS query on marine_biodiversity × marine_data.
    2. Retrieves semantic ecological profiles from Qdrant bio_knowledge.
    Returns combined structured result for the Synthesizer.
    """
    params = params or {}
    latency: Dict[str, float] = {}

    # ── 1. SQL cross-domain query ─────────────────────────────────────────────
    sql = _pick_sql_template(task_desc, params)
    rows: List[Dict[str, Any]] = []
    t_sql = _time.perf_counter()
    try:
        from src.database.postgres import execute_query
        rows = await execute_query(sql)
    except Exception as e:
        log.warning("Biodiversity SQL query failed: %s", e)
        # Soft-fail — Qdrant context alone is still useful
    latency["sql_ms"] = round((_time.perf_counter() - t_sql) * 1000.0, 1)

    # ── 2. Qdrant bio_knowledge semantic retrieval ────────────────────────────
    qdrant_profiles: List[Dict[str, Any]] = []
    t_vec = _time.perf_counter()
    try:
        qdrant_profiles = await search_similar(
            query=task_desc,
            collection_name="bio_knowledge",
            limit=params.get("top_k", 5),
        )
    except Exception as e:
        log.warning("Qdrant bio_knowledge search failed: %s", e)
    latency["qdrant_ms"] = round((_time.perf_counter() - t_vec) * 1000.0, 1)

    # ── 3. Produce stress risk flags ─────────────────────────────────────────
    stress_flags: List[str] = []
    for row in rows:
        doxy = row.get("dissolved_oxygen_umol_kg")
        temp = row.get("water_temp_c")
        sp = row.get("scientific_name", "Unknown")
        if doxy is not None and float(doxy) < 50:
            stress_flags.append(f"⚠️ {sp}: dissolved oxygen {doxy} µmol/kg below critical hypoxia floor")
        if temp is not None and float(temp) > 29.0:
            stress_flags.append(f"🌡️ {sp}: water temperature {temp}°C exceeds typical upper thermal limit")

    return {
        "sql": sql,
        "rows": rows,
        "row_count": len(rows),
        "qdrant_profiles": qdrant_profiles,
        "stress_flags": stress_flags,
        "species": params.get("species", ""),
        "latency": latency,
    }
