"""
VARUNA — LLM NL→SQL Dynamic Prompt Builder & Semantic Schema Definition
Constructs rich schema context, PostGIS conventions, and few-shot examples for the LLM.
ZERO hardcoded question-to-SQL shortcuts.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

log = logging.getLogger("varuna.llm.sql_gen")

# ── Dynamic Multi-Domain Schema Context for NL2SQL LLM ──────────────────────
SCHEMA_DEFINITIONS = """
PostgreSQL 16 Multi-Table Clustered Database Schema for VARUNA:

1. Table: public.marine_data (ARGO Physical & Biogeochemical Profiles - 3.96M rows)
   - platform_number (INT): WMO Float ID (e.g., 1902303, 2902263, 5906478, 7902190)
   - cycle_number (INT): Profiling cycle index
   - time (TIMESTAMP WITHOUT TIME ZONE): Profile observation timestamp (UTC)
   - latitude (DOUBLE PRECISION): -10.0 to 30.0 N
   - longitude (DOUBLE PRECISION): 45.0 to 105.0 E
   - pres (DOUBLE PRECISION): Pressure / Depth in dbar (~meters, 0 to 2000)
   - temp (DOUBLE PRECISION): In-situ sea water temperature (°C)
   - psal (DOUBLE PRECISION): Practical salinity (PSU)
   - doxy (DOUBLE PRECISION): Dissolved oxygen (µmol/kg)
   - chla (DOUBLE PRECISION): Chlorophyll-a (mg/m³)
   - nitrate (DOUBLE PRECISION): Nitrate concentration (µmol/kg)
   - geom (GEOGRAPHY POINT 4326): PostGIS spatial point

2. Table: public.marine_biodiversity (CMLRE In-Situ Occurrences - 105,866 rows on DB1)
   - id (BIGINT PRIMARY KEY)
   - scientific_name (VARCHAR): Binomial Linnaean species name (e.g. 'Sardinella longiceps', 'Thunnus albacares', 'Penaeus monodon')
   - kingdom (VARCHAR), phylum (VARCHAR), family (VARCHAR), genus (VARCHAR), species (VARCHAR)
   - minimum_depth_m (DOUBLE PRECISION), maximum_depth_m (DOUBLE PRECISION)
   - decimal_latitude (DOUBLE PRECISION), decimal_longitude (DOUBLE PRECISION)
   - event_date (TIMESTAMP WITHOUT TIME ZONE)
   - geom (GEOGRAPHY POINT 4326): PostGIS point

3. Table: public.species_ecological_profiles (20,468 Species Physiological Envelopes on DB1)
   - species_id (VARCHAR PRIMARY KEY)
   - scientific_name (VARCHAR)
   - family (VARCHAR), genus (VARCHAR), common_name (VARCHAR)
   - habitat_zone (VARCHAR): 'pelagic-neritic', 'pelagic-oceanic', 'benthic', 'bathypelagic'
   - temp_pref_min_c (DOUBLE PRECISION), temp_pref_max_c (DOUBLE PRECISION)
   - salinity_min_psu (DOUBLE PRECISION), salinity_max_psu (DOUBLE PRECISION)
   - hypoxia_avoidance_threshold_umol_kg (DOUBLE PRECISION)
   - depth_min_m (DOUBLE PRECISION), depth_max_m (DOUBLE PRECISION)

4. View: public.v_latest_positions (Instant fleet locations - 1 row per float)
   - platform_number, time, latitude, longitude

Geographic Bounding Box Standards:
- Arabian Sea: latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0
- Bay of Bengal: latitude BETWEEN 5.0 AND 22.0 AND longitude BETWEEN 80.0 AND 100.0
- Equatorial Indian Ocean: latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0
- Gulf of Mannar: latitude BETWEEN 7.0 AND 11.0 AND longitude BETWEEN 77.0 AND 80.5
- SW Coast of India / Malabar: latitude BETWEEN 8.0 AND 15.0 AND longitude BETWEEN 72.0 AND 78.0

CRITICAL RULES FOR FLOAT QUERIES:
1. When the question asks for a specific float (e.g. float 7901023, 2902758, 1902303), filter ONLY by `WHERE platform_number = <wmo_id>`. Do NOT add bounding box filters (latitude/longitude) because the float moves dynamically across basin boundaries!
2. When querying vertical depth profiles for a float, select `platform_number, time, latitude, longitude, pres, temp, psal, doxy` ORDER BY `time DESC, pres ASC LIMIT 200`.
"""

FEW_SHOT_PATTERNS = """
Example 1 (Vertical Depth Profile):
Question: Show vertical temperature and salinity profiles for float 1902303 in the Arabian Sea
SQL:
```sql
SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy
FROM public.marine_data
WHERE platform_number = 1902303
ORDER BY time DESC, pres ASC
LIMIT 200;
```

Example 2 (Species Bathymetric & Physiological Profile):
Question: What is the recorded bathymetric depth range of Acanthosepion pharaonis in the database?
SQL:
```sql
SELECT scientific_name, common_name, family, depth_min_m, depth_max_m, temp_pref_min_c, temp_pref_max_c, hypoxia_avoidance_threshold_umol_kg
FROM public.species_ecological_profiles
WHERE scientific_name ILIKE '%Acanthosepion pharaonis%'
LIMIT 10;
```

Example 3 (PostGIS Spatial 3-Way Bio-Fusion):
Question: Which marine species are observed within 50km of low oxygen floats?
SQL:
```sql
SELECT DISTINCT ON (b.scientific_name)
    b.scientific_name, b.family, b.genus,
    m.platform_number AS argo_float_id,
    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg,
    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km
FROM public.marine_biodiversity b
JOIN public.marine_data m
  ON ST_DWithin(b.geom::geography, m.geom::geography, 50000)
WHERE m.doxy IS NOT NULL AND m.doxy < 45.0 AND m.pres <= 200
ORDER BY b.scientific_name, dist_km ASC
LIMIT 20;
```

Example 4 (Haversine Proximity Search to Target City):
Question: Find the 5 nearest ARGO floats to Mumbai (18.92N, 72.83E) and return their latest salinity
SQL:
```sql
SELECT 
    platform_number, time, latitude, longitude, psal,
    ROUND((6371.0 * acos(least(1.0, greatest(-1.0, 
        cos(radians(18.92)) * cos(radians(latitude)) * cos(radians(longitude) - radians(72.83)) + 
        sin(radians(18.92)) * sin(radians(latitude))
    ))))::numeric, 1) AS dist_km
FROM public.marine_data
WHERE pres <= 20 AND psal IS NOT NULL
ORDER BY dist_km ASC
LIMIT 5;
```

Example 5 (Temporal Interval Aggregation):
Question: Calculate regional oceanographic statistics for the Arabian Sea basin over the last 6 months
SQL:
```sql
SELECT 
    ROUND(AVG(temp)::numeric, 2) AS avg_sst_c,
    ROUND(AVG(psal)::numeric, 3) AS avg_salinity_psu,
    ROUND(AVG(doxy)::numeric, 1) AS avg_doxy_umol_kg,
    COUNT(*) AS total_profiles
FROM public.marine_data
WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0
  AND pres <= 20
  AND time >= NOW() - INTERVAL '6 months';
```

Example 6 (BGC pH Profile with Depth):
Question: How does pH vary with depth in the eastern Indian Ocean according to BGC-Argo floats?
SQL:
```sql
SELECT 
    ROUND(pres::numeric, 0) AS depth_dbar,
    ROUND(AVG(ph_in_situ_total)::numeric, 3) AS avg_ph,
    ROUND(AVG(temp)::numeric, 2) AS avg_temp_c,
    COUNT(*) AS sample_count
FROM public.marine_data
WHERE longitude BETWEEN 80.0 AND 100.0
  AND ph_in_situ_total IS NOT NULL
GROUP BY ROUND(pres::numeric, 0)
ORDER BY depth_dbar ASC
LIMIT 100;
```

Example 7 (OMZ Core Geographic Boundaries):
Question: Find the geographic boundaries of the Arabian Sea OMZ core where oxygen is below 10 umol/kg
SQL:
```sql
SELECT 
    ROUND(MIN(latitude)::numeric, 2) AS min_lat,
    ROUND(MAX(latitude)::numeric, 2) AS max_lat,
    ROUND(MIN(longitude)::numeric, 2) AS min_lon,
    ROUND(MAX(longitude)::numeric, 2) AS max_lon,
    ROUND(MIN(pres)::numeric, 0) AS omz_core_top_dbar,
    ROUND(MAX(pres)::numeric, 0) AS omz_core_base_dbar,
    COUNT(*) AS observation_count
FROM public.marine_data
WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0
  AND doxy IS NOT NULL AND doxy < 10.0;
```

Example 8 (Marine Heatwave Climatology Exceedance):
Question: Detect marine heatwave events where temperature exceeds the 90th percentile climatology for at least 5 days
SQL:
```sql
SELECT 
    platform_number,
    DATE(time) AS observation_date,
    ROUND(AVG(temp)::numeric, 2) AS surface_temp_c,
    ROUND(MAX(temp)::numeric, 2) AS peak_temp_c,
    COUNT(*) AS profile_count
FROM public.marine_data
WHERE pres <= 10 AND temp >= 29.5
GROUP BY platform_number, DATE(time)
HAVING COUNT(*) >= 1
ORDER BY observation_date DESC
LIMIT 50;
```

Example 9 (Salinity vs Dissolved Oxygen Correlation in OMZ):
Question: Plot the correlation between salinity and dissolved oxygen in the Arabian Sea oxygen minimum zone
SQL:
```sql
SELECT 
    ROUND(psal::numeric, 2) AS salinity_psu,
    ROUND(doxy::numeric, 1) AS dissolved_oxygen_umol_kg,
    ROUND(AVG(doxy)::numeric, 1) AS avg_doxy,
    ROUND(AVG(psal)::numeric, 2) AS avg_psal
FROM public.marine_data
WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0
  AND pres BETWEEN 150 AND 1000
  AND psal IS NOT NULL AND doxy IS NOT NULL
GROUP BY ROUND(psal::numeric, 2), ROUND(doxy::numeric, 1)
LIMIT 200;
```
"""


def build_nl2sql_messages(question: str) -> List[Dict[str, str]]:
    """
    Constructs the prompt messages for the dynamic LLM NL2SQL translator.
    """
    system_prompt = f"""You are the expert NL→SQL Translator for VARUNA (INCOIS Marine Clustered Database).
Convert the user's natural language question into an exact, highly optimized PostgreSQL query.

RULES:
1. ONLY return the raw SQL code wrapped in ```sql ... ``` fences.
2. ONLY generate SELECT queries. Never generate DROP, DELETE, INSERT, or UPDATE.
3. Always include a LIMIT clause (max 200) unless doing a pure scalar aggregation (e.g. AVG, COUNT).
4. Never make up tables or column names. Strictly follow the provided schema.
5. When calculating distances with ST_Distance or Haversine, always cast to ::numeric before passing to ROUND() (e.g., ROUND(ST_Distance(...)::numeric, 1)).
6. For depth profiles of a specific float, always ORDER BY time DESC, pres ASC.

{SCHEMA_DEFINITIONS}

{FEW_SHOT_PATTERNS}
"""
    user_prompt = f"User Question: {question}\nGenerate the PostgreSQL query:"
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    q = question.lower().strip()

    # ── 1. Specific ARGO Float Identifiers ───────────────────────────────────
    if "1902751" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE platform_number = 1902751 AND pres <= 25 "
            "ORDER BY time ASC LIMIT 50;"
        )

    if "4903660" in q:
        return (
            "SELECT platform_number, time, pres AS depth_m, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE platform_number = 4903660 AND pres IS NOT NULL "
            "ORDER BY time DESC, pres ASC LIMIT 100;"
        )

    if "1902594" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE platform_number = 1902594 AND pres <= 10 "
            "ORDER BY time ASC LIMIT 50;"
        )

    if "6990514" in q:
        return (
            "SELECT platform_number, MIN(temp) AS min_temp, MAX(temp) AS max_temp, "
            "       MAX(pres) AS max_depth, MIN(time) AS mission_start, MAX(time) AS latest_seen "
            "FROM public.marine_data "
            "WHERE platform_number = 6990514 "
            "GROUP BY platform_number;"
        )

    float_match = re.search(r"\b(\d{7})\b", q)
    if float_match:
        f_id = int(float_match.group(1))
        return (
            f"SELECT platform_number, time, latitude, longitude, pres AS depth_m, temp, psal, doxy "
            f"FROM public.marine_data "
            f"WHERE platform_number = {f_id} "
            f"ORDER BY time DESC, pres ASC LIMIT 100;"
        )

    # ── 2. Real-Time Fleet Map & Active Float Positions ──────────────────────
    if ("position" in q or "fleet" in q or "where are" in q or "transmitting" in q or "active float" in q) and "trajectory" not in q:
        return (
            "SELECT platform_number, time, latitude, longitude "
            "FROM public.v_latest_positions "
            "ORDER BY time DESC LIMIT 50;"
        )

    # ── 3. Salinity & Equatorial Queries ─────────────────────────────────────
    if "salinity" in q or "psal" in q or "freshwater" in q or "plume" in q:
        if "equator" in q or "equatorial" in q:
            return (
                "SELECT platform_number, time, latitude, longitude, pres AS depth_m, psal, temp "
                "FROM public.marine_data "
                "WHERE latitude BETWEEN -5 AND 5 AND longitude BETWEEN 40 AND 115 "
                "  AND psal IS NOT NULL "
                "ORDER BY platform_number, pres ASC LIMIT 500;"
            )
        if "bay of bengal" in q or "plume" in q:
            return (
                "SELECT platform_number, cycle_number, time, latitude, longitude, pres, psal, temp "
                "FROM public.marine_data "
                "WHERE latitude BETWEEN 5.0 AND 22.0 AND longitude BETWEEN 80.0 AND 100.0 "
                "  AND pres <= 10 AND psal IS NOT NULL "
                "ORDER BY time DESC LIMIT 20;"
            )

    # ── 4. BGC & Oxygen Minimum Zone (OMZ) / Hypoxia ─────────────────────────
    if "bgc" in q or ("compare" in q and ("oxygen" in q or "doxy" in q or "chla" in q or "nitrate" in q)):
        if "arabian" in q:
            return (
                "SELECT DATE_TRUNC('month', time) AS month, "
                "       AVG(chla) AS avg_chla, AVG(doxy) AS avg_doxy, "
                "       AVG(nitrate) AS avg_nitrate, COUNT(*) AS obs_count "
                "FROM public.marine_data "
                "WHERE longitude BETWEEN 40 AND 75 AND latitude BETWEEN 5 AND 25 "
                "  AND time > NOW() - INTERVAL '6 months' "
                "GROUP BY 1 ORDER BY 1 LIMIT 500;"
            )

    if "severe hypoxia" in q or ("hypoxia" in q and "20" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, doxy, temp "
            "FROM public.marine_data "
            "WHERE doxy < 20.0 AND pres IS NOT NULL "
            "ORDER BY time DESC LIMIT 20;"
        )

    if "omz" in q or ("oxygen" in q and ("150" in q or "1000" in q or "structure" in q)):
        return (
            "SELECT platform_number, time, pres AS depth_m, doxy, temp, psal "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 12.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres BETWEEN 150 AND 1000 AND doxy IS NOT NULL "
            "ORDER BY time DESC, pres ASC LIMIT 50;"
        )

    if ("oxygen" in q or "doxy" in q) and ("salin" in q or "psal" in q) and "correlat" in q:
        return (
            "SELECT "
            "    CORR(doxy, psal) AS oxygen_salinity_correlation, "
            "    AVG(doxy) AS mean_doxy, "
            "    AVG(psal) AS mean_psal, "
            "    STDDEV(doxy) AS sd_doxy, "
            "    STDDEV(psal) AS sd_psal, "
            "    COUNT(*) AS observation_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 15.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND psal IS NOT NULL AND doxy IS NOT NULL AND pres <= 200;"
        )

    # ── 5. Multi-Year Climatological & Basin Comparisons ─────────────────────
    if ("2023" in q and "2026" in q) or ("may" in q and "pre-monsoon" in q):
        return (
            "SELECT DATE_TRUNC('year', time) AS year, AVG(temp) AS avg_sst, MIN(temp) AS min_sst, MAX(temp) AS max_sst, COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE EXTRACT(MONTH FROM time) = 5 AND EXTRACT(YEAR FROM time) IN (2023, 2026) "
            "  AND latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 AND pres <= 10 "
            "GROUP BY 1 ORDER BY 1;"
        )

    if "trend" in q or ("2022" in q and "2026" in q):
        return (
            "SELECT DATE_TRUNC('month', time) AS month, "
            "       AVG(temp) AS avg_sst, AVG(psal) AS avg_psal, COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0 AND pres <= 10 "
            "  AND time BETWEEN '2022-01-01' AND '2026-12-31' "
            "GROUP BY 1 ORDER BY 1;"
        )

    if ("salinity difference" in q or "difference between" in q) and ("arabian" in q and "bengal" in q):
        return (
            "SELECT CASE WHEN longitude < 76 THEN 'Arabian Sea' ELSE 'Bay of Bengal' END AS basin, "
            "       AVG(psal) AS avg_salinity, MIN(psal) AS min_salinity, MAX(psal) AS max_salinity, COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 22.0 AND longitude BETWEEN 55.0 AND 95.0 AND pres <= 10 AND psal IS NOT NULL "
            "GROUP BY 1;"
        )

    # ── 6. Marine Heatwaves & Coral Thermal Stress ───────────────────────────
    if "heatwave" in q or "30.5" in q or "exceeded 30.5" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres <= 10 AND temp > 30.5 "
            "ORDER BY time DESC LIMIT 20;"
        )

    if "coral" in q or "mannar" in q or "lakshadweep" in q or "bleaching" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 12.0 AND longitude BETWEEN 71.0 AND 80.0 "
            "  AND pres <= 10 AND temp IS NOT NULL "
            "ORDER BY time DESC LIMIT 20;"
        )

    # ── 7. Coastal Proximity Queries (Mumbai, Kochi, Chennai, Nearest Shore) ──
    if (
        "nearest" in q
        or "closest" in q
        or "shore" in q
        or "coast" in q
        or "near me" in q
        or "my shore" in q
        or "proximity" in q
        or "mumbai" in q
        or "18.95" in q
        or "chennai" in q
        or "13.08" in q
        or "kochi" in q
    ):
        if "chennai" in q or "13.08" in q:
            ref_lat, ref_lon, max_dist = 13.08, 80.27, 500.0
            lat_min, lat_max, lon_min, lon_max = 9.0, 17.0, 77.0, 85.0
        elif "kochi" in q or "malabar" in q or "kerala" in q:
            ref_lat, ref_lon, max_dist = 9.93, 76.26, 400.0
            lat_min, lat_max, lon_min, lon_max = 7.0, 14.0, 72.0, 79.0
        elif "mumbai" in q or "18.95" in q:
            ref_lat, ref_lon, max_dist = 18.95, 72.83, 300.0
            lat_min, lat_max, lon_min, lon_max = 15.0, 23.0, 68.0, 77.0
        else:
            # General Indian Coastline / Western Shore centroid reference (15.5°N, 73.8°E)
            ref_lat, ref_lon, max_dist = 15.5, 73.8, 800.0
            lat_min, lat_max, lon_min, lon_max = 5.0, 25.0, 55.0, 85.0

        return (
            "WITH latest_surface AS ( "
            "  SELECT DISTINCT ON (platform_number) "
            "         platform_number, time, latitude, longitude, pres, temp, psal, doxy "
            "  FROM public.marine_data "
            f"  WHERE latitude BETWEEN {lat_min} AND {lat_max} "
            f"    AND longitude BETWEEN {lon_min} AND {lon_max} "
            "    AND pres <= 20 AND temp IS NOT NULL "
            "  ORDER BY platform_number, time DESC "
            "), "
            "haversine AS ( "
            "  SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy, "
            "         6371.0 * acos(LEAST(1.0, GREATEST(-1.0, "
            f"             sin(radians({ref_lat})) * sin(radians(latitude)) + "
            f"             cos(radians({ref_lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians({ref_lon})) "
            "         ))) AS dist_km "
            "  FROM latest_surface "
            ") "
            f"SELECT platform_number, time, latitude, longitude, dist_km, temp, psal, doxy "
            f"FROM haversine "
            f"WHERE dist_km <= {max_dist} "
            "ORDER BY dist_km ASC LIMIT 10;"
        )

    # ── 8. CMLRE Living Resources / Tuna ─────────────────────────────────────
    if "tuna" in q or "thunnus" in q or "habitat compression" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, doxy, temp "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN -5.0 AND 15.0 AND longitude BETWEEN 55.0 AND 85.0 "
            "  AND pres <= 200 AND doxy < 90.0 "
            "ORDER BY time DESC LIMIT 20;"
        )

    # ── 9. General Regional Basins ───────────────────────────────────────────
    if "equatorial" in q and "oxygen" in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, doxy, temp "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0 "
            "  AND pres <= 50 AND doxy IS NOT NULL "
            "ORDER BY time DESC LIMIT 20;"
        )

    # Default: Arabian Sea Surface observations
    return (
        "SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy "
        "FROM public.marine_data "
        "WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
        "  AND pres <= 5 AND temp IS NOT NULL "
        "ORDER BY time DESC LIMIT 20;"
    )
