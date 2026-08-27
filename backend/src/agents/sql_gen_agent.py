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

3. Table: public.marine_biodiversity (CMLRE In-Situ Biodiversity Occurrences — 105,866 rows on DB1)
Columns:
  id (BIGINT PRIMARY KEY), occurrence_id (VARCHAR), scientific_name (VARCHAR)
  kingdom (VARCHAR), phylum (VARCHAR), class_name (VARCHAR), order_name (VARCHAR), family (VARCHAR), genus (VARCHAR), species (VARCHAR)
  minimum_depth_m (DOUBLE PRECISION), maximum_depth_m (DOUBLE PRECISION)
  decimal_latitude (DOUBLE PRECISION), decimal_longitude (DOUBLE PRECISION), event_date (TIMESTAMP WITHOUT TIME ZONE), geom (GEOGRAPHY POINT 4326)
* NOTE: Species ecological profiles (common_name, thermal/salinity/hypoxia thresholds) live in Qdrant bio_knowledge. In SQL, query scientific_name, family, genus, minimum_depth_m, maximum_depth_m, decimal_latitude, decimal_longitude, event_date.

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

    from src.llm.sql_gen import build_nl2sql_messages

    t_llm = _time.perf_counter()
    messages = build_nl2sql_messages(task_desc)
    raw_output = await chat_complete(messages, temperature=0.0, task_tag="sql_gen", trace=trace)
    latency["llm_nl2sql_ms"] = round((_time.perf_counter() - t_llm) * 1000.0, 1)
    sql_candidate = extract_sql(raw_output)

    # Pure LLM NL2SQL with AST sanitization
    t_san = _time.perf_counter()
    clean_sql: Optional[str] = None
    error_msg: Optional[str] = None

    if sql_candidate and "SELECT" in sql_candidate.upper():
        try:
            clean_sql = sanitize_sql(sql_candidate)
            latency["sql_source"] = "llm"
        except Exception as e:
            log.warning("SQL Sanitization failed on LLM candidate: %s", str(e))
            error_msg = f"Sanitization Error: {str(e)}"
            clean_sql = None
    else:
        error_msg = f"LLM failed to produce valid SELECT query (Raw output: {raw_output[:100]})"
        clean_sql = None

    latency["sql_sanitize_ms"] = round((_time.perf_counter() - t_san) * 1000.0, 1)

    # Execute against database pool if valid SQL was generated
    t_db = _time.perf_counter()
    rows = []
    if clean_sql:
        try:
            rows = run_sql(clean_sql, limit=200)
            # If 0 rows and query has a specific platform_number + spatial bounds, auto-relax bounding box
            if not rows and "platform_number" in clean_sql and ("latitude" in clean_sql or "longitude" in clean_sql):
                import re as _re
                relaxed_sql = _re.sub(r"\s+AND\s+latitude\s+BETWEEN\s+[\d\.\-]+\s+AND\s+[\d\.\-]+", "", clean_sql, flags=_re.IGNORECASE)
                relaxed_sql = _re.sub(r"\s+AND\s+longitude\s+BETWEEN\s+[\d\.\-]+\s+AND\s+[\d\.\-]+", "", relaxed_sql, flags=_re.IGNORECASE)
                relaxed_sql = _re.sub(r"\s+AND\s+ST_[\w]+\([^)]+\)", "", relaxed_sql, flags=_re.IGNORECASE)
                if relaxed_sql != clean_sql:
                    log.info("Auto-relaxing geographic bounds for platform query: %s", relaxed_sql)
                    relaxed_rows = run_sql(relaxed_sql, limit=200)
                    if relaxed_rows:
                        rows = relaxed_rows
                        clean_sql = relaxed_sql
        except Exception as e:
            log.error("PostgreSQL execution failed on generated SQL: %s", str(e))
            error_msg = f"Database Error: {str(e)}"
    latency["db_execute_ms"] = round((_time.perf_counter() - t_db) * 1000.0, 1)

    status = "OK"
    if error_msg:
        status = "ERROR"
    elif not rows:
        status = "NO_DATA"

    return {
        "sql": clean_sql or "",
        "rows": rows,
        "row_count": len(rows),
        "columns": list(rows[0].keys()) if rows else [],
        "status": status,
        "error": error_msg,
        "latency": latency,
    }

