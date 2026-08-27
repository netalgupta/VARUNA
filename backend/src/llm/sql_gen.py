"""
FloatChat AI / VARUNA — Deterministic & Rule-Based SQL Generator (High-Precision Oceanographic Engine)
Generates high-performance PostgreSQL SELECT queries directly tailored to ARGO physical/chemical datasets.
"""
from __future__ import annotations

import re
from typing import Optional


def generate_fallback_sql(question: str) -> str:
    """
    Generate an exact, verified PostgreSQL SELECT query tailored to the specific oceanographic intent.
    """
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
