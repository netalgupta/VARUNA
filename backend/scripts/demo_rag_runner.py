"""
VARUNA — Multi-Agent RAG & DAG Query Demonstration Runner
Executes 22 comprehensive, domain-unique oceanographic demonstration queries against
the dual-Supabase database cluster (3.96M observations) and OpenRouter cognitive engine.

Outputs:
1. Real-time console demonstration feed with execution statistics.
2. backend/artifacts/DEMO_EVALUATION_RESULTS.md (Comprehensive markdown report).
3. backend/artifacts/DEMO_EVALUATION_RESULTS.json (Structured evaluation traces).
"""

from __future__ import annotations

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import argparse
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.agents.orchestrator import plan_and_execute
from src.config import settings

# Suppress verbose debug logs during demonstration run
logging.basicConfig(level=logging.WARNING)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 22 Completely Unique Oceanographic Demonstration Queries
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMO_QUERIES: List[Dict[str, str]] = [
    # ── Category 1: Real-Time & Recent Physical Conditions (2026 / DB2) ──────
    {
        "id": "Q01",
        "category": "Real-Time Physical State",
        "query": "What is the latest sea surface temperature and salinity observed by ARGO floats in the Arabian Sea?",
        "intent": "RECENT_SST_ARABIAN_SEA"
    },
    {
        "id": "Q02",
        "category": "Real-Time Physical State",
        "query": "Find the most recent salinity observations in the Bay of Bengal and detect any freshwater plume signal.",
        "intent": "RECENT_SALINITY_BOB"
    },
    {
        "id": "Q03",
        "category": "Real-Time Physical State",
        "query": "What are the latest surface positions and timestamps for actively transmitting ARGO floats across the Indian Ocean?",
        "intent": "LATEST_FLEET_POSITIONS"
    },
    {
        "id": "Q04",
        "category": "Real-Time Physical State",
        "query": "Show the latest dissolved oxygen concentrations recorded in the upper 50m of the equatorial Indian Ocean.",
        "intent": "SURFACE_DOXY_EQUATORIAL"
    },

    # ── Category 2: Specific Real ARGO Float Platforms & Trajectories ────────
    {
        "id": "Q05",
        "category": "ARGO Platform Diagnostics",
        "query": "Show the surfacing drift trajectory and recent temperature observations for active ARGO float 1902751.",
        "intent": "FLOAT_TRAJECTORY_1902751"
    },
    {
        "id": "Q06",
        "category": "ARGO Platform Diagnostics",
        "query": "Retrieve the vertical depth profile for temperature, salinity, and pressure measured by float 4903660.",
        "intent": "DEPTH_CAST_4903660"
    },
    {
        "id": "Q07",
        "category": "ARGO Platform Diagnostics",
        "query": "Compare the earliest 2023 observations of float 1902594 with its newest 2026 surfacing coordinates.",
        "intent": "MULTI_YEAR_FLOAT_1902594"
    },
    {
        "id": "Q08",
        "category": "ARGO Platform Diagnostics",
        "query": "What is the maximum depth and minimum temperature measured by float 6990514 across its mission?",
        "intent": "FLOAT_EXTREMES_6990514"
    },

    # ── Category 3: Oxygen Minimum Zones & Biogeochemical Dynamics ───────────
    {
        "id": "Q09",
        "category": "Hypoxia & OMZ Dynamics",
        "query": "Analyze the vertical structure of the Oxygen Minimum Zone (OMZ) in the northern Arabian Sea between 150m and 1000m depth.",
        "intent": "ARABIAN_SEA_OMZ_VERTICAL"
    },
    {
        "id": "Q10",
        "category": "Hypoxia & OMZ Dynamics",
        "query": "Identify any ARGO float profiles recording severe hypoxia with dissolved oxygen below 20 µmol/kg in 2026.",
        "intent": "SEVERE_HYPOXIA_2026"
    },
    {
        "id": "Q11",
        "category": "Hypoxia & OMZ Dynamics",
        "query": "How do dissolved oxygen concentrations correlate with practical salinity in the high-evaporation northern Arabian Sea?",
        "intent": "DOXY_PSAL_CORRELATION"
    },

    # ── Category 4: Multi-Year Climatological & Seasonal Comparisons (DB1 + DB2)
    {
        "id": "Q12",
        "category": "Multi-Year Trends",
        "query": "Compare the average Arabian Sea surface temperature in pre-monsoon May 2023 with pre-monsoon May 2026.",
        "intent": "MULTI_YEAR_MAY_COMPARISON"
    },
    {
        "id": "Q13",
        "category": "Multi-Year Trends",
        "query": "What is the multi-year monthly average sea surface temperature trend across the equatorial Indian Ocean from 2022 to 2026?",
        "intent": "EQUATORIAL_TREND_2022_2026"
    },
    {
        "id": "Q14",
        "category": "Multi-Year Trends",
        "query": "Examine the seasonal salinity difference between the Arabian Sea and Bay of Bengal across all recorded observations.",
        "intent": "BASIN_SALINITY_COMPARISON"
    },

    # ── Category 5: Marine Heatwaves & Thermal Stress (Hobday 2016) ───────────
    {
        "id": "Q15",
        "category": "Marine Heatwaves & Extremes",
        "query": "Detect potential Marine Heatwave conditions where sea surface temperatures exceeded 30.5°C in the Arabian Sea.",
        "intent": "MHW_DETECTION_30C"
    },
    {
        "id": "Q16",
        "category": "Marine Heatwaves & Extremes",
        "query": "Identify high thermal stress events in the Lakshadweep and Gulf of Mannar coral reef regions (lat 8-12N, lon 71-80E).",
        "intent": "CORAL_THERMAL_STRESS"
    },

    # ── Category 6: Coastal Proximity & Maritime Hub Queries ─────────────────
    {
        "id": "Q17",
        "category": "Coastal Proximity",
        "query": "Find the closest ARGO float observation to Mumbai coast (lat 18.95N, lon 72.83E) within 300km.",
        "intent": "PROXIMITY_MUMBAI"
    },
    {
        "id": "Q18",
        "category": "Coastal Proximity",
        "query": "What are the nearest ARGO surface temperature and salinity profiles near Kochi and the Malabar upwelling coast?",
        "intent": "PROXIMITY_KOCHI"
    },
    {
        "id": "Q19",
        "category": "Coastal Proximity",
        "query": "Locate ARGO float observations off the Chennai coast (lat 13.08N, lon 80.27E) in the Bay of Bengal.",
        "intent": "PROXIMITY_CHENNAI"
    },

    # ── Category 7: CMLRE Ecological Impact & Fisheries Habitat ──────────────
    {
        "id": "Q20",
        "category": "CMLRE Marine Living Resources",
        "query": "Evaluate whether current sea surface temperatures in the Malabar coast exceed the optimal 26.0°C thermal envelope of Indian Oil Sardine (Sardinella longiceps).",
        "intent": "SARDINE_THERMAL_SUITABILITY"
    },
    {
        "id": "Q21",
        "category": "CMLRE Marine Living Resources",
        "query": "Assess potential habitat compression for Yellowfin Tuna (Thunnus albacares) due to Oxygen Minimum Zone shoaling below 90 µmol/kg.",
        "intent": "TUNA_HABITAT_COMPRESSION"
    },
    {
        "id": "Q22",
        "category": "CMLRE Marine Living Resources",
        "query": "What is the thermal bleaching risk for Staghorn Coral (Acropora millepora) given recent Gulf of Mannar temperature anomalies?",
        "intent": "CORAL_BLEACHING_RISK"
    }
]


async def run_single_query(item: Dict[str, str], idx: int, total: int) -> Dict[str, Any]:
    """Executes a single demonstration query through the multi-agent DAG pipeline."""
    qid = item["id"]
    category = item["category"]
    query = item["query"]

    print(f"\n[{idx}/{total}] 🌊 [{qid}] ({category})")
    print(f" Query: \"{query}\"")

    t0 = time.perf_counter()
    try:
        res = await plan_and_execute(query)
        latency_sec = time.perf_counter() - t0

        rows_count = len(res.rows) if res.rows else 0
        has_citations = "[WMO:" in (res.answer_markdown or "") or "Row #" in (res.answer_markdown or "") or "float" in (res.answer_markdown or "").lower()

        # Distinguish between: data found vs. query ran but returned zero rows
        if rows_count > 0:
            exec_status = "SUCCESS_DATA"
        else:
            exec_status = "NO_DATA"  # SQL executed, but 0 rows matched filter

        print(f" -> Status: {exec_status} in {latency_sec:.2f}s | Rows: {rows_count} | Citations: {has_citations}")
        if res.sql:
            print(f" -> SQL: {res.sql.strip().replace(chr(10), ' ')[:90]}...")

        # Extract per-stage latencies from agent trace tasks
        agent_latencies: Dict[str, Any] = {}
        if res.agent_trace and hasattr(res.agent_trace, "tasks"):
            for task in res.agent_trace.tasks:
                lat = getattr(task, "latency_breakdown", {}) or {}
                if getattr(task, "agent_type", "") == "SQL_GEN":
                    agent_latencies["llm_nl2sql_ms"] = lat.get("llm_nl2sql_ms", 0.0)
                    agent_latencies["db_execute_ms"] = lat.get("db_execute_ms", 0.0)
                    agent_latencies["sql_sanitize_ms"] = lat.get("sql_sanitize_ms", 0.0)
                    agent_latencies["sql_source"] = lat.get("sql_source", "unknown")

        return {
            "id": qid,
            "category": category,
            "query": query,
            "status": exec_status,
            "data_found": rows_count > 0,
            "latency_seconds": round(latency_sec, 2),
            "sql": res.sql or "",
            "rows_count": rows_count,
            "has_citations": has_citations,
            "answer_markdown": res.answer_markdown or "",
            "sample_rows": res.rows[:3] if res.rows else [],
            "agent_latencies": agent_latencies,
            "trace": res.agent_trace.model_dump() if res.agent_trace else {}
        }
    except Exception as e:
        latency_sec = time.perf_counter() - t0
        print(f" -> Status: FAILED in {latency_sec:.2f}s | Error: {e}")
        return {
            "id": qid,
            "category": category,
            "query": query,
            "status": "FAILED",
            "latency_seconds": round(latency_sec, 2),
            "error": str(e),
            "sql": "",
            "rows_count": 0,
            "has_citations": False,
            "answer_markdown": f"Execution error: {str(e)}",
            "sample_rows": [],
            "trace": {}
        }


def save_reports(results: List[Dict[str, Any]], total_time: float) -> None:
    """Generates and writes structured Markdown and JSON demonstration artifacts."""
    artifacts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts"))
    os.makedirs(artifacts_dir, exist_ok=True)

    json_path = os.path.join(artifacts_dir, "DEMO_EVALUATION_RESULTS.json")
    md_path = os.path.join(artifacts_dir, "DEMO_EVALUATION_RESULTS.md")

    # 1. Write JSON Report
    data_cnt = sum(1 for r in results if r["status"] == "SUCCESS_DATA")
    no_data_cnt = sum(1 for r in results if r["status"] == "NO_DATA")
    failed_cnt = sum(1 for r in results if r["status"] == "FAILED")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_queries": len(results),
            "total_execution_seconds": round(total_time, 2),
            "average_latency_seconds": round(sum(r["latency_seconds"] for r in results) / max(1, len(results)), 2),
            "queries_with_data": data_cnt,
            "queries_no_data": no_data_cnt,
            "queries_failed": failed_cnt,
            "results": results
        }, f, indent=2, default=str)

    # Count queries that actually found data
    data_count = sum(1 for r in results if r["status"] == "SUCCESS_DATA")
    no_data_count = sum(1 for r in results if r["status"] == "NO_DATA")
    failed_count = sum(1 for r in results if r["status"] == "FAILED")
    avg_latency = sum(r["latency_seconds"] for r in results) / max(1, len(results))

    md_lines = [
        "# VARUNA — Ocean Intelligence Multi-Agent Demonstration Evaluation",
        f"**Generated**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"**Database Backbone**: Supabase Dual-Sharded Mesh (`3,961,238` Physical Observations)  ",
        f"**Cognitive Engine**: OpenRouter `{settings.openrouter_model}`  ",
        "",
        "## 1. Executive Summary & Benchmark Metrics",
        "",
        "| Metric | Value |",
        "| :--- | :--- |",
        f"| **Total Unique Queries** | `{len(results)}` |",
        f"| **Queries With Data Found** | `{data_count}` |",
        f"| **Queries Returning No Rows (NO_DATA)** | `{no_data_count}` |",
        f"| **Failed Executions** | `{failed_count}` |",
        f"| **Total Benchmark Runtime** | `{total_time:.2f} seconds` |",
        f"| **Average Query Latency** | `{avg_latency:.2f} seconds` |",
        "",
        "---",
        "",
        "## 2. Granular Query Results & Latency Breakdown Matrix",
        "",
        "| ID | Category | Question (truncated) | Total (s) | NL→SQL (ms) | DB Exec (ms) | Rows | SQL Source | Status |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for r in results:
        alat = r.get("agent_latencies", {})
        nl2sql_ms = alat.get("llm_nl2sql_ms", 0.0)
        db_ms = alat.get("db_execute_ms", 0.0)
        sql_src = alat.get("sql_source", "-")

        # Extract duration_ms from trace tasks (the actual schema stores duration_ms per task)
        sql_gen_ms = 0.0
        synth_ms = 0.0
        for task in r.get("trace", {}).get("tasks", []):
            if task.get("agent_type") == "SQL_GEN":
                sql_gen_ms = task.get("duration_ms", 0.0)
                # latency_breakdown sub-keys if present
                lb = task.get("latency_breakdown", {})
                nl2sql_ms = lb.get("llm_nl2sql_ms", 0.0)
                db_ms = lb.get("db_execute_ms", 0.0)
            elif task.get("agent_type") == "SYNTHESIZER":
                synth_ms = task.get("duration_ms", 0.0)

        # If no granular breakdown, fall back to full sql_gen duration
        if nl2sql_ms == 0.0 and sql_gen_ms > 0.0:
            nl2sql_ms = sql_gen_ms

        status_icon = "✅ DATA" if r["status"] == "SUCCESS_DATA" else ("🟡 NO_DATA" if r["status"] == "NO_DATA" else "❌ FAILED")
        md_lines.append(
            f"| `{r['id']}` | **{r['category']}** | {r['query'][:70]}... | `{r['latency_seconds']}s` | `{nl2sql_ms:.0f}ms` | `{db_ms:.0f}ms` | `{r['rows_count']}` | `{sql_src}` | `{status_icon}` |"
        )

    md_lines.append("\n---\n\n## 3. Detailed Query Outputs & Grounded Scientific Syntheses\n")

    for r in results:
        md_lines.append(f"### 🌊 [{r['id']}] {r['query']}")
        md_lines.append(f"- **Category**: {r['category']}")
        md_lines.append(f"- **Total Latency**: `{r['latency_seconds']}s` | **Database Rows**: `{r['rows_count']}`")
        
        lb = r.get("trace", {}).get("latency_breakdown", {})
        if lb:
            md_lines.append("\n**Granular Execution Latency Breakdown:**")
            md_lines.append("```json")
            md_lines.append(json.dumps(lb, indent=2))
            md_lines.append("```")

        if r.get("sql"):
            md_lines.append("\n**Executed PostgreSQL AST Query:**")
            md_lines.append(f"```sql\n{r['sql'].strip()}\n```")
        md_lines.append("\n**Synthesized Scientific Answer:**\n")
        md_lines.append(r["answer_markdown"])
        md_lines.append("\n---\n")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print("\n" + "="*80)
    print(f"✅ DEMONSTRATION COMPLETE: {data_count}/{len(results)} queries found data | {no_data_count} NO_DATA | {failed_count} FAILED")
    print(f"⏱  Total: {total_time:.2f}s | Average: {avg_latency:.2f}s per query")
    print(f"📄 Markdown Report Saved: {md_path}")
    print(f"📦 JSON Artifact Saved:   {json_path}")
    print("="*80 + "\n")


async def main():
    parser = argparse.ArgumentParser(description="VARUNA Demonstration Query Runner")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of queries to run (e.g. --limit 5)")
    parser.add_argument("--category", type=str, default=None, help="Filter by category")
    parser.add_argument("--id", type=str, default=None, help="Run specific query ID (e.g. --id Q01)")
    args = parser.parse_args()

    selected = list(DEMO_QUERIES)
    if args.id:
        selected = [q for q in selected if q["id"].upper() == args.id.upper()]
    elif args.category:
        selected = [q for q in selected if args.category.lower() in q["category"].lower()]
    
    if args.limit:
        selected = selected[:args.limit]

    print("="*80)
    print(f"🌊 VARUNA — Multi-Agent Demonstration Query Suite ({len(selected)} Unique Queries)")
    print(f"📡 Real Supabase Mesh: DB1 (Historical) + DB2 (Recent) | OpenRouter: {settings.openrouter_model}")
    print("="*80)

    t_start = time.perf_counter()
    results = []

    for idx, item in enumerate(selected, 1):
        res = await run_single_query(item, idx, len(selected))
        results.append(res)

    total_time = time.perf_counter() - t_start
    save_reports(results, total_time)


if __name__ == "__main__":
    asyncio.run(main())
