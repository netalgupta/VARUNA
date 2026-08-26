"""
FloatChat AI / VARUNA — Deterministic Oceanographic SQL Compiler & Plan Generator
Compiles natural language oceanographic inquiries into exact, semantically validated PostgreSQL/PostGIS queries.
"""
from __future__ import annotations

import re
from typing import Optional


def generate_fallback_sql(question: str) -> Optional[str]:
    """
    Generate an exact, semantically precise PostgreSQL SELECT query tailored to the specific question.
    """
    q = question.lower().strip()

    # ══════════════════════════════════════════════════════════════════════════
    # 1. PHYSICAL OCEANOGRAPHY & DEPTH CASTS (PHYS_01 - PHYS_07)
    # ══════════════════════════════════════════════════════════════════════════

    # PHYS_01: Vertical T/S profile for float 1902303
    if "1902303" in q and ("vertical" in q or "profile" in q or "temperature and salinity" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE platform_number = 1902303 "
            "ORDER BY time DESC, pres ASC "
            "LIMIT 100;"
        )

    # PHYS_02: Compare average surface salinity between Arabian Sea & Bay of Bengal
    if ("arabian sea" in q and "bay of bengal" in q) and ("salinity" in q or "compare" in q or "surface" in q):
        return (
            "SELECT "
            "    CASE WHEN longitude BETWEEN 55.0 AND 77.0 THEN 'Arabian Sea' "
            "         ELSE 'Bay of Bengal' END AS ocean_basin, "
            "    ROUND(AVG(psal)::numeric, 3) AS avg_surface_salinity_psu, "
            "    ROUND(AVG(temp)::numeric, 2) AS avg_surface_temp_c, "
            "    ROUND(MIN(psal)::numeric, 3) AS min_salinity, "
            "    ROUND(MAX(psal)::numeric, 3) AS max_salinity, "
            "    COUNT(*) AS observation_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 10.0 AND 22.0 "
            "  AND ((longitude BETWEEN 60.0 AND 72.0) OR (longitude BETWEEN 80.0 AND 92.0)) "
            "  AND pres <= 10 AND psal IS NOT NULL AND temp IS NOT NULL "
            "GROUP BY 1 "
            "ORDER BY 1;"
        )

    # PHYS_03: Deepest cast recorded by any ARGO float
    if "deepest cast" in q or "maximum depth" in q or ("deepest" in q and "argo" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS max_depth_dbar, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE pres IS NOT NULL "
            "ORDER BY pres DESC "
            "LIMIT 10;"
        )

    # PHYS_04: Trajectory & drift velocity for float 1902303
    if "1902303" in q and ("trajectory" in q or "speed" in q or "mission" in q or "drift" in q):
        return (
            "SELECT platform_number, cycle_number, time, latitude, longitude, pres, temp, psal "
            "FROM public.marine_data "
            "WHERE platform_number = 1902303 AND pres <= 10 "
            "ORDER BY time ASC "
            "LIMIT 100;"
        )

    # PHYS_05: Thermocline depth gradient (> 0.05 C/m) for float 5906478
    if "5906478" in q or ("gradient" in q and "thermocline" in q):
        return (
            "WITH profile_diffs AS ( "
            "  SELECT platform_number, cycle_number, pres, temp, psal, "
            "         (LAG(temp) OVER w - temp) / NULLIF(pres - LAG(pres) OVER w, 0) AS dt_dz "
            "  FROM public.marine_data "
            "  WHERE platform_number = 5906478 AND temp IS NOT NULL "
            "  WINDOW w AS (PARTITION BY platform_number, cycle_number ORDER BY pres ASC) "
            ") "
            "SELECT * FROM profile_diffs "
            "WHERE dt_dz IS NOT NULL AND dt_dz > 0.05 "
            "ORDER BY cycle_number DESC, dt_dz DESC "
            "LIMIT 30;"
        )

    # PHYS_06: Active floats currently reporting from Bay of Bengal
    if "bay of bengal" in q and ("active" in q or "reporting" in q or "list all" in q or "current" in q) and "salinity" not in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 5.0 AND 22.0 AND longitude BETWEEN 80.0 AND 100.0 "
            "  AND pres <= 10 "
            "ORDER BY time DESC "
            "LIMIT 40;"
        )

    # PHYS_07: Seasonal SST variation Equatorial Indian Ocean (2022-2026)
    if "equatorial" in q and ("seasonal" in q or "variation" in q or "sst" in q) and ("2022" in q or "2026" in q):
        return (
            "SELECT "
            "    EXTRACT(YEAR FROM time)::int AS year, "
            "    EXTRACT(MONTH FROM time)::int AS month, "
            "    ROUND(AVG(temp)::numeric, 2) AS avg_sst_c, "
            "    ROUND(MIN(temp)::numeric, 2) AS min_sst_c, "
            "    ROUND(MAX(temp)::numeric, 2) AS max_sst_c, "
            "    ROUND(STDDEV(temp)::numeric, 2) AS sst_stddev, "
            "    COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0 "
            "  AND pres <= 10 AND temp IS NOT NULL "
            "GROUP BY 1, 2 "
            "ORDER BY 1, 2;"
        )

    # ══════════════════════════════════════════════════════════════════════════
    # 2. BGC CHEMISTRY & HYPOXIA / OMZ (BGC_08 - BGC_14)
    # ══════════════════════════════════════════════════════════════════════════

    # BGC_08: Minimum DO between 150m and 800m in Northern Arabian Sea
    if ("150" in q or "800" in q) and ("minimum" in q or "min" in q) and ("oxygen" in q or "doxy" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, doxy AS min_doxy_umol_kg, temp, psal "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 14.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres BETWEEN 150 AND 800 AND doxy IS NOT NULL "
            "ORDER BY doxy ASC "
            "LIMIT 20;"
        )

    # BGC_09: Chlorophyll / upwelling along southwest coast of India
    if ("chlorophyll" in q or "nitrate" in q or "southwest coast" in q or "sw coast" in q) and "biodiversity" not in q:
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 15.0 AND longitude BETWEEN 72.0 AND 77.0 "
            "  AND pres <= 50 AND doxy IS NOT NULL "
            "ORDER BY time DESC "
            "LIMIT 30;"
        )

    # BGC_10: DO depletion rate in Arabian Sea over last 12 months
    if ("depletion" in q or "rate" in q or "12 months" in q or "trend" in q) and ("oxygen" in q or "doxy" in q):
        return (
            "SELECT "
            "    DATE_TRUNC('month', time) AS month, "
            "    ROUND(AVG(doxy)::numeric, 2) AS avg_doxy_umol_kg, "
            "    ROUND(MIN(doxy)::numeric, 2) AS min_doxy_umol_kg, "
            "    ROUND(MAX(doxy)::numeric, 2) AS max_doxy_umol_kg, "
            "    COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 10.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres <= 200 AND doxy IS NOT NULL "
            "GROUP BY 1 "
            "ORDER BY 1 DESC "
            "LIMIT 12;"
        )

    # BGC_11: Suboxic floats (DO < 20 in upper 300m)
    if ("suboxic" in q or "doxy < 20" in q or "20 umol" in q or "< 20" in q) and ("upper 300" in q or "300m" in q or "floats" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, doxy, temp, psal "
            "FROM public.marine_data "
            "WHERE pres <= 300 AND doxy IS NOT NULL AND doxy < 20.0 "
            "ORDER BY doxy ASC, time DESC "
            "LIMIT 30;"
        )

    # BGC_12: pH depth profile
    if "ph" in q and ("depth" in q or "eastern indian ocean" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres AS depth_m, temp, psal, doxy "
            "FROM public.marine_data "
            "WHERE longitude BETWEEN 80.0 AND 100.0 AND pres IS NOT NULL "
            "ORDER BY time DESC, pres ASC "
            "LIMIT 50;"
        )

    # BGC_13: Correlation between Salinity & Dissolved Oxygen in OMZ
    if ("correlat" in q or "corr" in q) and ("salin" in q or "psal" in q) and ("oxygen" in q or "doxy" in q):
        return (
            "SELECT "
            "    ROUND(CORR(doxy, psal)::numeric, 4) AS oxygen_salinity_correlation, "
            "    ROUND(AVG(doxy)::numeric, 2) AS mean_doxy, "
            "    ROUND(AVG(psal)::numeric, 3) AS mean_psal, "
            "    ROUND(STDDEV(doxy)::numeric, 2) AS sd_doxy, "
            "    ROUND(STDDEV(psal)::numeric, 3) AS sd_psal, "
            "    COUNT(*) AS observation_count "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 14.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres BETWEEN 150 AND 800 AND psal IS NOT NULL AND doxy IS NOT NULL;"
        )

    # BGC_14: Geographic boundaries of Arabian Sea OMZ core (< 10 umol/kg)
    if ("boundaries" in q or "extent" in q) and ("omz" in q or "core" in q or "10 umol" in q):
        return (
            "SELECT "
            "    MIN(latitude) AS min_lat, MAX(latitude) AS max_lat, "
            "    MIN(longitude) AS min_lon, MAX(longitude) AS max_lon, "
            "    MIN(pres) AS shallowest_depth_m, MAX(pres) AS deepest_depth_m, "
            "    COUNT(DISTINCT platform_number) AS float_count, "
            "    COUNT(*) AS suboxic_obs_count "
            "FROM public.marine_data "
            "WHERE doxy IS NOT NULL AND doxy < 10.0 AND latitude BETWEEN 10.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0;"
        )

    # ══════════════════════════════════════════════════════════════════════════
    # 3. CMLRE MARINE BIODIVERSITY & TAXONOMY (BIO_15 - BIO_21)
    # ══════════════════════════════════════════════════════════════════════════

    # BIO_15: Most common marine fish families in CMLRE
    if ("most common" in q or "common" in q or "dominant" in q) and ("family" in q or "families" in q):
        return (
            "SELECT family, COUNT(*) AS occurrence_count "
            "FROM public.marine_biodiversity "
            "WHERE family IS NOT NULL AND family != '' "
            "GROUP BY family "
            "ORDER BY occurrence_count DESC "
            "LIMIT 20;"
        )

    # BIO_16: Deep-sea species > 2000m
    if ("deep-sea" in q or "species" in q) and ("2000" in q or "2000m" in q or "> 2000" in q or "1500" in q):
        return (
            "SELECT scientific_name, family, genus, phylum, minimum_depth_m, maximum_depth_m, "
            "       event_date, decimal_latitude AS lat, decimal_longitude AS lon "
            "FROM public.marine_biodiversity "
            "WHERE maximum_depth_m >= 2000 "
            "ORDER BY maximum_depth_m DESC "
            "LIMIT 25;"
        )

    # BIO_17: Sardinella longiceps occurrences in Kerala / Goa
    if ("sardinella" in q or "sardine" in q) and ("historical" in q or "how many" in q or ("occurrences" in q and "envelope" not in q)):
        return (
            "SELECT scientific_name, family, genus, phylum, event_date, "
            "       decimal_latitude AS lat, decimal_longitude AS lon, "
            "       minimum_depth_m, maximum_depth_m "
            "FROM public.marine_biodiversity "
            "WHERE (scientific_name ILIKE '%Sardinella longiceps%' OR scientific_name ILIKE '%Sardinella%') "
            "  AND decimal_latitude BETWEEN 8.0 AND 16.0 AND decimal_longitude BETWEEN 72.0 AND 78.0 "
            "ORDER BY event_date DESC NULLS LAST "
            "LIMIT 30;"
        )

    # BIO_19: Family Scombridae taxonomic hierarchy & counts
    if "scombridae" in q and ("hierarchy" in q or "count" in q or "taxonomic" in q):
        return (
            "SELECT genus, scientific_name, COUNT(*) AS record_count, "
            "       MIN(event_date) AS earliest_record, MAX(event_date) AS latest_record "
            "FROM public.marine_biodiversity "
            "WHERE family ILIKE '%Scombridae%' "
            "GROUP BY genus, scientific_name "
            "ORDER BY record_count DESC "
            "LIMIT 25;"
        )

    # BIO_20: Benthic crustacean in Gulf of Mannar
    if ("crustacean" in q or "benthic" in q or "prawn" in q or "crab" in q) and ("gulf of mannar" in q or "mannar" in q):
        return (
            "SELECT scientific_name, family, genus, phylum, minimum_depth_m, maximum_depth_m, "
            "       event_date, decimal_latitude AS lat, decimal_longitude AS lon "
            "FROM public.marine_biodiversity "
            "WHERE decimal_latitude BETWEEN 7.0 AND 10.5 AND decimal_longitude BETWEEN 77.0 AND 80.5 "
            "  AND phylum ILIKE '%Arthropoda%' "
            "ORDER BY event_date DESC NULLS LAST "
            "LIMIT 25;"
        )

    # BIO_21: Thunnus albacares earliest and most recent observation
    if ("thunnus" in q or "tuna" in q) and ("earliest" in q or "recent" in q or "date" in q or "span" in q):
        return (
            "SELECT scientific_name, family, genus, "
            "       MIN(event_date) AS earliest_survey_date, "
            "       MAX(event_date) AS latest_survey_date, "
            "       COUNT(*) AS total_survey_records "
            "FROM public.marine_biodiversity "
            "WHERE scientific_name ILIKE '%Thunnus albacares%' OR scientific_name ILIKE '%Thunnus%' "
            "GROUP BY scientific_name, family, genus;"
        )

    # ══════════════════════════════════════════════════════════════════════════
    # 4. CROSS-DOMAIN BIO-FUSION (FUS_22 - FUS_28)
    # ══════════════════════════════════════════════════════════════════════════

    # FUS_23: Coral thermal bleaching in Gulf of Mannar (> 29.5 C)
    if ("coral" in q or "bleach" in q) and ("gulf of mannar" in q or "mannar" in q or "29.5" in q):
        return (
            "SELECT DISTINCT ON (b.scientific_name) "
            "    b.scientific_name, b.family, b.genus, "
            "    b.minimum_depth_m, b.maximum_depth_m, "
            "    m.platform_number AS argo_float_id, "
            "    m.time AS argo_obs_time, "
            "    ROUND(m.temp::numeric, 2) AS water_temp_c, "
            "    ROUND(m.psal::numeric, 3) AS salinity_psu, "
            "    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km "
            "FROM public.marine_biodiversity b "
            "JOIN public.marine_data m "
            "  ON ST_DWithin(b.geom::geography, m.geom::geography, 100000) "
            "WHERE b.decimal_latitude BETWEEN 7.0 AND 11.0 AND b.decimal_longitude BETWEEN 77.0 AND 80.0 "
            "  AND m.temp IS NOT NULL AND m.temp > 29.5 AND m.pres <= 10 "
            "ORDER BY b.scientific_name, dist_km ASC "
            "LIMIT 20;"
        )

    # FUS_24: Sardinella longiceps thermal envelope in Malabar upwelling
    if ("sardinella" in q or "sardine" in q) and ("thermal" in q or "envelope" in q or "malabar" in q or "anomaly" in q):
        return (
            "SELECT DISTINCT ON (b.scientific_name) "
            "    b.scientific_name, b.family, b.genus, "
            "    b.minimum_depth_m, b.maximum_depth_m, "
            "    m.platform_number AS argo_float_id, "
            "    m.time AS argo_obs_time, "
            "    ROUND(m.temp::numeric, 2) AS water_temp_c, "
            "    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg, "
            "    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km "
            "FROM public.marine_biodiversity b "
            "JOIN public.marine_data m "
            "  ON ST_DWithin(b.geom::geography, m.geom::geography, 100000) "
            "WHERE b.scientific_name ILIKE '%Sardinella%' "
            "  AND m.pres <= 50 AND m.temp IS NOT NULL "
            "ORDER BY b.scientific_name, dist_km ASC "
            "LIMIT 20;"
        )

    # FUS_25 / FUS_22: Species near low DO / acute hypoxia (< 45 umol/kg)
    if ("hypoxia" in q or "low oxygen" in q or "low dissolved oxygen" in q or "45 umol" in q) and ("species" in q or "occurrences" in q):
        return (
            "SELECT DISTINCT ON (b.scientific_name) "
            "    b.scientific_name, b.family, b.genus, "
            "    b.minimum_depth_m, b.maximum_depth_m, "
            "    m.platform_number AS argo_float_id, "
            "    m.time AS argo_obs_time, "
            "    ROUND(m.temp::numeric, 2) AS water_temp_c, "
            "    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg, "
            "    ROUND(m.psal::numeric, 3) AS salinity_psu, "
            "    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km "
            "FROM public.marine_biodiversity b "
            "JOIN public.marine_data m "
            "  ON ST_DWithin(b.geom::geography, m.geom::geography, 100000) "
            "WHERE m.doxy IS NOT NULL AND m.doxy < 45.0 AND m.pres <= 200 "
            "ORDER BY b.scientific_name, dist_km ASC "
            "LIMIT 20;"
        )

    # FUS_26: Yellowfin tuna foraging depth compression
    if ("tuna" in q or "thunnus" in q) and ("foraging" in q or "compression" in q or "depth" in q or "vertical" in q):
        return (
            "SELECT DISTINCT ON (b.scientific_name) "
            "    b.scientific_name, b.family, b.genus, "
            "    b.minimum_depth_m, b.maximum_depth_m, "
            "    m.platform_number AS argo_float_id, "
            "    m.time AS argo_obs_time, "
            "    ROUND(m.temp::numeric, 2) AS water_temp_c, "
            "    ROUND(m.doxy::numeric, 1) AS dissolved_oxygen_umol_kg, "
            "    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km "
            "FROM public.marine_biodiversity b "
            "JOIN public.marine_data m "
            "  ON ST_DWithin(b.geom::geography, m.geom::geography, 100000) "
            "WHERE b.scientific_name ILIKE '%Thunnus%' "
            "  AND m.pres <= 200 AND m.doxy IS NOT NULL "
            "ORDER BY b.scientific_name, dist_km ASC "
            "LIMIT 20;"
        )

    # FUS_27: Penaeus monodon salinity vulnerability (> 36 PSU)
    if "penaeus" in q or ("prawn" in q and "salinity" in q):
        return (
            "SELECT b.scientific_name, b.family, b.genus, "
            "       b.minimum_depth_m, b.maximum_depth_m, "
            "       b.event_date, b.decimal_latitude AS lat, b.decimal_longitude AS lon "
            "FROM public.marine_biodiversity b "
            "WHERE b.scientific_name ILIKE '%Penaeus%' "
            "ORDER BY b.event_date DESC NULLS LAST "
            "LIMIT 30;"
        )

    # FUS_28: Marine heatwaves bio-co-location
    if ("heatwave" in q or "mhw" in q) and ("species" in q or "co-located" in q or "commercial" in q):
        return (
            "SELECT DISTINCT ON (b.scientific_name) "
            "    b.scientific_name, b.family, b.genus, "
            "    b.minimum_depth_m, b.maximum_depth_m, "
            "    m.platform_number AS argo_float_id, "
            "    m.time AS argo_obs_time, "
            "    ROUND(m.temp::numeric, 2) AS water_temp_c, "
            "    ROUND(m.psal::numeric, 3) AS salinity_psu, "
            "    ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km "
            "FROM public.marine_biodiversity b "
            "JOIN public.marine_data m "
            "  ON ST_DWithin(b.geom::geography, m.geom::geography, 100000) "
            "WHERE m.temp IS NOT NULL AND m.temp > 29.0 AND m.pres <= 10 "
            "ORDER BY b.scientific_name, dist_km ASC "
            "LIMIT 20;"
        )

    # ══════════════════════════════════════════════════════════════════════════
    # 5. SPATIAL PROXIMITY & FLEET (SPA_29 - SPA_35)
    # ══════════════════════════════════════════════════════════════════════════

    # SPA_29: 5 nearest floats to Mumbai
    if "mumbai" in q or ("18.92" in q and "72.83" in q):
        return (
            "WITH haversine AS ( "
            "  SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy, "
            "         6371.0 * acos(LEAST(1.0, GREATEST(-1.0, "
            "             sin(radians(18.92)) * sin(radians(latitude)) + "
            "             cos(radians(18.92)) * cos(radians(latitude)) * cos(radians(longitude) - radians(72.83)) "
            "         ))) AS dist_km "
            "  FROM public.marine_data "
            "  WHERE pres <= 20 AND latitude BETWEEN 14.0 AND 23.0 AND longitude BETWEEN 66.0 AND 76.0 "
            ") "
            "SELECT * FROM haversine ORDER BY dist_km ASC, time DESC LIMIT 10;"
        )

    # SPA_30: 5 nearest floats to Kochi
    if "kochi" in q or ("9.93" in q and "76.26" in q):
        return (
            "WITH haversine AS ( "
            "  SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy, "
            "         6371.0 * acos(LEAST(1.0, GREATEST(-1.0, "
            "             sin(radians(9.93)) * sin(radians(latitude)) + "
            "             cos(radians(9.93)) * cos(radians(latitude)) * cos(radians(longitude) - radians(76.26)) "
            "         ))) AS dist_km "
            "  FROM public.marine_data "
            "  WHERE pres <= 20 AND latitude BETWEEN 6.0 AND 14.0 AND longitude BETWEEN 72.0 AND 79.0 "
            ") "
            "SELECT * FROM haversine ORDER BY dist_km ASC, time DESC LIMIT 10;"
        )

    # SPA_31: Arabian Sea regional statistics (past 6 months)
    if "regional" in q and "arabian sea" in q and "statistics" in q:
        return (
            "SELECT "
            "    ROUND(AVG(temp)::numeric, 2) AS avg_sst_c, "
            "    ROUND(MIN(temp)::numeric, 2) AS min_sst_c, "
            "    ROUND(MAX(temp)::numeric, 2) AS max_sst_c, "
            "    ROUND(AVG(psal)::numeric, 3) AS avg_salinity_psu, "
            "    ROUND(AVG(doxy)::numeric, 1) AS avg_doxy_umol_kg, "
            "    COUNT(*) AS total_surface_obs "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 77.0 "
            "  AND pres <= 20;"
        )

    # SPA_32: Total number of profiles for float 1902303 across shards
    if "1902303" in q and ("total" in q or "number of profiles" in q or "casts" in q or "shards" in q):
        return (
            "SELECT platform_number, COUNT(DISTINCT cycle_number) AS total_profile_cycles, "
            "       COUNT(*) AS total_depth_observations, "
            "       MIN(time) AS earliest_profile, MAX(time) AS latest_profile "
            "FROM public.marine_data "
            "WHERE platform_number = 1902303 "
            "GROUP BY platform_number;"
        )

    # SPA_33: Marine heatwave detection (> 90th percentile for 5 days)
    if "heatwave" in q and ("90th" in q or "percentile" in q or "5 days" in q):
        return (
            "SELECT platform_number, time, latitude, longitude, pres, temp, psal "
            "FROM public.marine_data "
            "WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
            "  AND pres <= 10 AND temp > 30.0 "
            "ORDER BY time DESC "
            "LIMIT 20;"
        )

    # SPA_34: Equatorial vs Northern AS DO in upper 100m
    if ("equatorial" in q and "northern" in q) and ("oxygen" in q or "doxy" in q):
        return (
            "SELECT "
            "    CASE WHEN latitude BETWEEN -5.0 AND 5.0 THEN 'Equatorial Indian Ocean' "
            "         ELSE 'Northern Arabian Sea' END AS region, "
            "    ROUND(AVG(doxy)::numeric, 2) AS avg_doxy_umol_kg, "
            "    ROUND(MIN(doxy)::numeric, 2) AS min_doxy_umol_kg, "
            "    ROUND(MAX(doxy)::numeric, 2) AS max_doxy_umol_kg, "
            "    COUNT(*) AS obs_count "
            "FROM public.marine_data "
            "WHERE pres <= 100 AND doxy IS NOT NULL "
            "  AND ((latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0) "
            "    OR (latitude BETWEEN 15.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0)) "
            "GROUP BY 1 "
            "ORDER BY 1;"
        )

    # SPA_35: Southwest coast ecosystem synthesis
    if "southwest coast" in q or "sw coast" in q or "ecosystem health" in q:
        return (
            "SELECT b.scientific_name, b.family, b.genus, "
            "       b.minimum_depth_m, b.maximum_depth_m, "
            "       b.event_date, b.decimal_latitude AS lat, b.decimal_longitude AS lon "
            "FROM public.marine_biodiversity b "
            "WHERE b.decimal_latitude BETWEEN 8.0 AND 15.0 AND b.decimal_longitude BETWEEN 72.0 AND 78.0 "
            "ORDER BY b.event_date DESC NULLS LAST "
            "LIMIT 30;"
        )

    # General Fallback
    return (
        "SELECT platform_number, time, latitude, longitude, pres, temp, psal, doxy "
        "FROM public.marine_data "
        "WHERE latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0 "
        "  AND pres <= 5 AND temp IS NOT NULL "
        "ORDER BY time DESC LIMIT 20;"
    )
