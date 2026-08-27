"""
VARUNA — NL→SQL Specialized Sub-Agent
Schema-RAG context injection, AST validation, and execution against PostgreSQL.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from src.database.postgres import run_sql
from src.llm.openrouter_client import chat_complete
from src.utils.sql_extract import extract_sql, sanitize_sql

log = logging.getLogger("varuna.agent.sql")

SCHEMA_CONTEXT = """
PostgreSQL 16 Schema for VARUNA (Indian Ocean Observations 2022 to 2026):

1. Table: public.marine_data (Canonical ARGO physical/chemical observations - 3.96M rows)
Columns:
  platform_number (INT): ARGO float WMO ID (e.g. 1902303, 2901742)
  cycle_number (INT): Profiling cycle index
  direction (CHAR): 'A' (ascending) or 'D' (descending)
  time (TIMESTAMP WITHOUT TIME ZONE): Profile observation timestamp (UTC)
  latitude (DOUBLE PRECISION): 0.0 to 30.0 N
  longitude (DOUBLE PRECISION): 50.0 to 100.0 E
  pres (DOUBLE PRECISION): Water pressure (dbar / ~depth in meters, 0 to 2000)
  temp (DOUBLE PRECISION): In-situ sea water temperature (°C)
  psal (DOUBLE PRECISION): Practical salinity (PSU)
  doxy (DOUBLE PRECISION): Dissolved oxygen concentration (µmol/kg)
  chla (DOUBLE PRECISION): Chlorophyll-a concentration (mg/m³)
  nitrate (DOUBLE PRECISION): Nitrate nutrient concentration (µmol/kg)
  ph_in_situ_total (DOUBLE PRECISION): Total in-situ seawater pH
  geom (GEOGRAPHY POINT 4326): PostGIS spatial point

2. View: public.v_latest_positions (Instant fleet locations - 1 row per float)
Columns:
  platform_number (INT): Float WMO ID
  time (TIMESTAMP): Latest observation timestamp (UTC)
  latitude (DOUBLE PRECISION): Latest latitude
  longitude (DOUBLE PRECISION): Latest longitude
* ALWAYS query public.v_latest_positions for 'current float locations', 'where are the floats now', or 'latest positions'.

3. Table: public.marine_biodiversity (CMLRE Darwin Core Taxonomy)
Columns:
  id (INT): Primary key
  scientific_name (VARCHAR): e.g. 'Sardinella longiceps', 'Rastrelliger kanagurta'
  common_name (VARCHAR): e.g. 'Indian Oil Sardine'
  latitude (DOUBLE PRECISION), longitude (DOUBLE PRECISION)
  depth_m (NUMERIC), event_date (DATE)
  thermal_range_min_c (NUMERIC), thermal_range_max_c (NUMERIC)

Geographic Regions:
  Arabian Sea: latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0
  Bay of Bengal: latitude BETWEEN 8.0 AND 22.0 AND longitude BETWEEN 78.0 AND 95.0
  Equatorial IO: latitude BETWEEN -5.0 AND 5.0 AND longitude BETWEEN 50.0 AND 100.0
"""

SYSTEM_PROMPT = f"""You are the NL→SQL Sub-Agent for VARUNA (INCOIS Ocean Data & CMLRE Living Resources).
Your task is to generate clean, high-performance PostgreSQL queries based on the user's question.

RULES:
1. ONLY return the raw SQL code wrapped in ```sql ... ``` fences.
2. ONLY generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DROP.
3. Always specify a LIMIT (maximum 200).
4. Use standard aggregations: AVG(temp), AVG(doxy), DATE_TRUNC('month', time).
5. For recent/current queries, use INTERVAL (e.g. time >= NOW() - INTERVAL '30 days') or public.v_latest_positions.
6. For spatial queries, use bounding boxes or PostGIS ST_DWithin / ST_Distance.

{SCHEMA_CONTEXT}
"""


async def execute_sql_task(
    task_desc: str,
    params: Optional[Dict[str, Any]] = None,
    trace: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Translates task description to SQL, sanitizes the query, and executes against the database.
    Returns results with granular per-phase latency breakdown.
    """
    import time as _time

    latency = {}

    # ALWAYS generate SQL from the natural language task description.
    # Never accept pre-built SQL from upstream plan params — the SQL_GEN agent
    # is responsible for translating NL → SQL via LLM or rule-based fallback.
    prompt = f"Generate SQL query for: {task_desc}"
    t_llm = _time.perf_counter()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    raw_output = await chat_complete(messages, temperature=0.0, task_tag="sql_gen", trace=trace)
    latency["llm_nl2sql_ms"] = round((_time.perf_counter() - t_llm) * 1000.0, 1)
    sql_candidate = extract_sql(raw_output)

    # Enforce strict AST validation; fall back to rule-based SQL if LLM output is bad
    t_san = _time.perf_counter()
    from src.llm.sql_gen import generate_fallback_sql
    try:
        if not sql_candidate or "SELECT" not in sql_candidate.upper():
            clean_sql = generate_fallback_sql(task_desc)
            latency["sql_source"] = "rule_engine"
        else:
            clean_sql = sanitize_sql(sql_candidate)
            latency["sql_source"] = "llm"
    except Exception as e:
        log.warning("SQL Sanitization failed, applying dynamic precision fallback: %s", str(e))
        clean_sql = generate_fallback_sql(task_desc)
        latency["sql_source"] = "rule_engine_fallback"
    latency["sql_sanitize_ms"] = round((_time.perf_counter() - t_san) * 1000.0, 1)

    # Execute against database pool
    t_db = _time.perf_counter()
    rows = run_sql(clean_sql, limit=200)
    latency["db_execute_ms"] = round((_time.perf_counter() - t_db) * 1000.0, 1)

    # If DB returns no rows, report it honestly — do NOT inject fabricated data
    if not rows:
        log.info("SQL query returned 0 rows for: %s", task_desc[:80])
        rows = []

    return {
        "sql": clean_sql,
        "rows": rows,
        "row_count": len(rows),
        "columns": list(rows[0].keys()) if rows else [],
        "status": "NO_DATA" if not rows else "OK",
        "latency": latency,
    }

