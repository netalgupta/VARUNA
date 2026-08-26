"""
VARUNA — Multi-Domain Complex Query Benchmark & Verification Suite
Executes 35 diverse queries across Physical, Chemical, Biodiversity, Bio-Fusion, and Spatial domains.
"""

from __future__ import annotations

import sys
import os
from pathlib import Path

# Ensure backend root is in sys.path
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

import json
import time
import asyncio
import logging
from typing import Any, Dict, List, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.WARNING, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from src.database.postgres import run_sql, route_query, get_active_floats, nearest_floats, float_trajectory, depth_profile, regional_stats
from src.database.qdrant import search_similar
from src.agents.biodiversity_agent import execute_biodiversity_task
from src.agents.sql_gen_agent import execute_sql_task

# ── Benchmark Query Matrix (35 Comprehensive Queries) ──────────────────────────

BENCHMARK_QUERIES = [
    # ── Category 1: Physical Oceanography & Depth Casts ────────────────────────
    {
        "id": "PHYS_01",
        "category": "Physical Oceanography",
        "query": "Show vertical temperature and salinity profiles for float 1902303 in the Arabian Sea.",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_02",
        "category": "Physical Oceanography",
        "query": "Compare average surface salinity between Arabian Sea (lat 10-22N, lon 60-72E) and Bay of Bengal (lat 10-22N, lon 80-92E).",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_03",
        "category": "Physical Oceanography",
        "query": "What is the deepest cast recorded by any ARGO float in the Indian Ocean?",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_04",
        "category": "Physical Oceanography",
        "query": "Retrieve surface trajectory and speed for float 1902303 over its mission.",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_05",
        "category": "Physical Oceanography",
        "query": "Identify the thermocline depth where temperature gradient exceeds 0.05 C per meter for float 5906478.",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_06",
        "category": "Physical Oceanography",
        "query": "List all active ARGO floats currently reporting from the Bay of Bengal with their latest coordinates.",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "PHYS_07",
        "category": "Physical Oceanography",
        "query": "Calculate the seasonal sea surface temperature variation across the Equatorial Indian Ocean from 2022 to 2026.",
        "type": "SQL_PHYSICAL",
    },

    # ── Category 2: BGC Chemistry & Hypoxia / OMZ Dynamics ────────────────────
    {
        "id": "BGC_08",
        "category": "BGC Chemistry & Hypoxia",
        "query": "What is the minimum dissolved oxygen observed between 150m and 800m depth in the Northern Arabian Sea?",
        "type": "SQL_BGC",
    },
    {
        "id": "BGC_09",
        "category": "BGC Chemistry & Hypoxia",
        "query": "Show chlorophyll-a concentration versus nitrate at depths above 50m along the southwest coast of India.",
        "type": "SQL_BGC",
    },
    {
        "id": "BGC_10",
        "category": "BGC Chemistry & Hypoxia",
        "query": "Analyze the dissolved oxygen depletion rate in the Arabian Sea over the last 12 months.",
        "type": "SQL_BGC",
    },
    {
        "id": "BGC_11",
        "category": "BGC Chemistry & Hypoxia",
        "query": "Which ARGO floats have recorded suboxic conditions (dissolved oxygen < 20 umol/kg) in the upper 300m?",
        "type": "SQL_BGC",
    },
    {
        "id": "BGC_12",
        "category": "BGC Chemistry & Hypoxia",
        "query": "How does pH vary with depth in the eastern Indian Ocean according to BGC-Argo floats?",
        "type": "SEMANTIC_RAG",
    },
    {
        "id": "BGC_13",
        "category": "BGC Chemistry & Hypoxia",
        "query": "Plot the correlation between salinity and dissolved oxygen in the Arabian Sea oxygen minimum zone.",
        "type": "SQL_BGC",
    },
    {
        "id": "BGC_14",
        "category": "BGC Chemistry & Hypoxia",
        "query": "Find the geographic boundaries of the Arabian Sea OMZ core where oxygen is below 10 umol/kg.",
        "type": "SEMANTIC_RAG",
    },

    # ── Category 3: Marine Biodiversity & Taxonomy (CMLRE 105k) ───────────────
    {
        "id": "BIO_15",
        "category": "Marine Biodiversity",
        "query": "What are the most commonly observed marine fish families in the CMLRE database across the Arabian Sea?",
        "type": "SQL_BIO",
    },
    {
        "id": "BIO_16",
        "category": "Marine Biodiversity",
        "query": "List all deep-sea species observed at depths greater than 2000 meters in the Indian Ocean.",
        "type": "SQL_BIO",
    },
    {
        "id": "BIO_17",
        "category": "Marine Biodiversity",
        "query": "How many historical occurrences of Sardinella longiceps are recorded off Kerala and Goa?",
        "type": "SQL_BIO",
    },
    {
        "id": "BIO_18",
        "category": "Marine Biodiversity",
        "query": "What is the recorded bathymetric depth range of Acanthosepion pharaonis in the IndOBIS database?",
        "type": "BIO_VECTOR",
    },
    {
        "id": "BIO_19",
        "category": "Marine Biodiversity",
        "query": "Show the taxonomic hierarchy and observation count for family Scombridae in the Indian Ocean.",
        "type": "SQL_BIO",
    },
    {
        "id": "BIO_20",
        "category": "Marine Biodiversity",
        "query": "Which benthic crustacean species have been sampled in the Gulf of Mannar?",
        "type": "SQL_BIO",
    },
    {
        "id": "BIO_21",
        "category": "Marine Biodiversity",
        "query": "What is the earliest and most recent observation date for Thunnus albacares in CMLRE surveys?",
        "type": "SQL_BIO",
    },

    # ── Category 4: Cross-Domain Bio-Fusion & Ecological Stress ──────────────
    {
        "id": "FUS_22",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Which marine species are observed near low dissolved oxygen ARGO floats in the Arabian Sea?",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_23",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Identify coral species in Gulf of Mannar that exceed their thermal tolerance limit when SST rises above 29.5 C.",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_24",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Correlate Sardinella longiceps thermal envelope with sea surface temperature anomalies in the Malabar upwelling zone.",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_25",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Find marine occurrences within 50km of ARGO floats experiencing acute hypoxia (< 45 umol/kg).",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_26",
        "category": "Cross-Domain Bio-Fusion",
        "query": "How does vertical oxygen compression in the Arabian Sea impact yellowfin tuna (Thunnus albacares) foraging depth?",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_27",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Assess the vulnerability of Penaeus monodon (Giant Tiger Prawn) under elevated coastal salinity (> 36 PSU).",
        "type": "BIO_FUSION",
    },
    {
        "id": "FUS_28",
        "category": "Cross-Domain Bio-Fusion",
        "query": "Which endangered or commercial marine species are co-located with active marine heatwave zones?",
        "type": "BIO_FUSION",
    },

    # ── Category 5: Spatial Proximity & Fleet Climatology ─────────────────────
    {
        "id": "SPA_29",
        "category": "Spatial Proximity & Fleet",
        "query": "Find the 5 nearest ARGO floats to Mumbai (18.92N, 72.83E) and return their latest salinity readings.",
        "type": "SPATIAL_PROXIMITY",
    },
    {
        "id": "SPA_30",
        "category": "Spatial Proximity & Fleet",
        "query": "Find the 5 nearest ARGO floats to Kochi (9.93N, 76.26E) and show their surface temperature.",
        "type": "SPATIAL_PROXIMITY",
    },
    {
        "id": "SPA_31",
        "category": "Spatial Proximity & Fleet",
        "query": "Calculate regional oceanographic statistics for the Arabian Sea basin over the last 6 months.",
        "type": "SPATIAL_PROXIMITY",
    },
    {
        "id": "SPA_32",
        "category": "Spatial Proximity & Fleet",
        "query": "What is the total number of profiles recorded by float 1902303 across both historical and live shards?",
        "type": "SQL_PHYSICAL",
    },
    {
        "id": "SPA_33",
        "category": "Spatial Proximity & Fleet",
        "query": "Detect marine heatwave events where temperature exceeds the 90th percentile climatology for at least 5 days.",
        "type": "SEMANTIC_RAG",
    },
    {
        "id": "SPA_34",
        "category": "Spatial Proximity & Fleet",
        "query": "Compare dissolved oxygen levels in the upper 100m between equatorial waters and the northern Arabian Sea.",
        "type": "SQL_BGC",
    },
    {
        "id": "SPA_35",
        "category": "Spatial Proximity & Fleet",
        "query": "Synthesize the overall marine ecosystem health report for the Southwest coast of India.",
        "type": "BIO_FUSION",
    },
]


async def run_single_benchmark(test: Dict[str, Any]) -> Dict[str, Any]:
    qid = test["id"]
    category = test["category"]
    query = test["query"]
    qtype = test["type"]
    
    t0 = time.perf_counter()
    sql_executed: Optional[str] = None
    row_count: int = 0
    qdrant_hits: int = 0
    answer_preview: str = ""
    status: str = "PASS"
    error_msg: Optional[str] = None

    try:
        if qtype in ("SQL_PHYSICAL", "SQL_BGC", "SQL_BIO"):
            # Dynamic LLM NL2SQL generation
            agent_res = await execute_sql_task(query)
            sql_executed = agent_res.get("sql")
            row_count = agent_res.get("row_count", 0)
            if agent_res.get("status") == "ERROR":
                status = "FAIL"
                error_msg = agent_res.get("error")

            # Fetch Qdrant domain context
            hits = await search_similar(query, collection_name="argo_knowledge", limit=2)
            qdrant_hits = len(hits)
            
        elif qtype == "BIO_VECTOR":
            hits = await search_similar(query, collection_name="bio_knowledge", limit=5)
            qdrant_hits = len(hits)
            row_count = len(hits)
            if hits:
                p = hits[0].get("payload", {})
                answer_preview = f"Species: {p.get('scientific_name')} | Temp: {p.get('temp_pref_min_c')}–{p.get('temp_pref_max_c')}°C | Depth: {p.get('depth_min_m')}–{p.get('depth_max_m')}m"

        elif qtype == "BIO_FUSION":
            res = await execute_biodiversity_task(query)
            sql_executed = res.get("sql")
            row_count = res.get("row_count", 0)
            qdrant_hits = len(res.get("qdrant_profiles", []))
            flags = res.get("stress_flags", [])
            answer_preview = f"Bio-Fusion: {row_count} co-located taxa, {qdrant_hits} tolerance profiles retrieved. Flags: {len(flags)}"

        elif qtype == "SPATIAL_PROXIMITY":
            if "mumbai" in query.lower():
                floats = nearest_floats(18.92, 72.83, limit=5)
                row_count = len(floats)
            elif "kochi" in query.lower():
                floats = nearest_floats(9.93, 76.26, limit=5)
                row_count = len(floats)
            else:
                stats = regional_stats("temp", "arabian_sea")
                row_count = len(stats) if stats else 1
            hits = await search_similar(query, collection_name="argo_knowledge", limit=2)
            qdrant_hits = len(hits)

        elif qtype == "SEMANTIC_RAG":
            hits = await search_similar(query, collection_name="argo_knowledge", limit=4)
            qdrant_hits = len(hits)
            row_count = len(hits)
            if hits:
                answer_preview = str(hits[0].get("payload", {}).get("text", ""))[:120] + "..."

    except Exception as e:
        status = "FAIL"
        error_msg = str(e)

    duration_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "id": qid,
        "category": category,
        "query": query,
        "type": qtype,
        "status": status,
        "duration_ms": duration_ms,
        "sql_executed": sql_executed,
        "row_count": row_count,
        "qdrant_hits": qdrant_hits,
        "answer_preview": answer_preview,
        "error_msg": error_msg,
    }


async def main():
    print("=" * 80)
    print(f"🚀 EXECUTING VARUNA 35-QUERY MULTI-DOMAIN BENCHMARK")
    print(f"   Targets: Supabase DB1 (Historical) + DB2 (Recent) + Qdrant Cloud (20.5k)")
    print("=" * 80)

    results = []
    pass_count = 0

    for i, test in enumerate(BENCHMARK_QUERIES, 1):
        print(f"[{i:02d}/35] Running {test['id']} ({test['category']})...", end="", flush=True)
        res = await run_single_benchmark(test)
        results.append(res)

        if res["status"] == "PASS":
            pass_count += 1
            print(f" ✅ PASS ({res['duration_ms']}ms | {res['row_count']} rows | {res['qdrant_hits']} vectors)")
        else:
            print(f" ❌ FAIL ({res['duration_ms']}ms | Error: {res['error_msg']})")

    # Output Markdown Summary Table
    print("\n" + "=" * 80)
    print(f"📊 BENCHMARK SUMMARY: {pass_count} / {len(BENCHMARK_QUERIES)} PASSED ({pass_count/len(BENCHMARK_QUERIES)*100:.1f}%)")
    print("=" * 80)

    # Save detailed JSON report
    out_json = _BACKEND_ROOT / "src" / "evaluation" / "benchmark_results.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved raw benchmark JSON to: {out_json}")


if __name__ == "__main__":
    asyncio.run(main())
