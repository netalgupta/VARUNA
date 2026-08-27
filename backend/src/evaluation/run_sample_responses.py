"""
VARUNA — Live Sample Query Response Generator
Executes 4 representative complex cross-domain queries and generates full scientific replies.
"""
from __future__ import annotations

import sys
import os
import json
import asyncio
from pathlib import Path

# Ensure backend root is in sys.path
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.database.postgres import run_sql, nearest_floats
from src.database.qdrant import search_similar
from src.agents.biodiversity_agent import execute_biodiversity_task
from src.agents.synthesizer_agent import synthesize_answer
from src.agents.sql_gen_agent import execute_sql_task

QUERIES_TO_DEMO = [
    {
        "title": "1. Hypoxia Avoidance & Physiological Stress in the Arabian Sea (Cross-Domain Bio-Fusion)",
        "query": "Which marine species are observed near low dissolved oxygen ARGO floats in the Arabian Sea, and what are their physiological stress indicators?",
        "mode": "bio_fusion",
    },
    {
        "title": "2. High-Salinity Arabian Sea vs Low-Salinity Bay of Bengal Comparison (Physical Climatology)",
        "query": "Compare average surface salinity and temperature between the Arabian Sea (lat 10-22N, lon 60-72E) and Bay of Bengal (lat 10-22N, lon 80-92E).",
        "mode": "physical_sql",
    },
    {
        "title": "3. IndOBIS & CMLRE Deep-Sea Bathymetric Biodiversity (>1500m)",
        "query": "List deep-sea marine species observed at depths exceeding 1500 meters in the Indian Ocean with their recorded depth ranges.",
        "mode": "bio_sql",
    },
    {
        "title": "4. Coastal Fleet Proximity & Surface Salinity (Mumbai Coast)",
        "query": "Find the nearest active ARGO floats to Mumbai (18.92N, 72.83E) and summarize their latest salinity and surface temperature readings.",
        "mode": "proximity",
    },
]


async def run_demo():
    for item in QUERIES_TO_DEMO:
        print(f"\n{'=' * 80}", flush=True)
        print(f"QUERY: {item['query']}", flush=True)
        print(f"DOMAIN: {item['title']}", flush=True)
        print(f"{'=' * 80}\n", flush=True)

        task_results = {}

        if item["mode"] == "bio_fusion":
            bio_res = await execute_biodiversity_task(item["query"])
            task_results["bio_task"] = bio_res
            sql_rows = bio_res.get("rows", [])
            task_results["sql_task"] = {"sql": bio_res.get("sql"), "rows": sql_rows}

        elif item["mode"] in ("physical_sql", "bio_sql"):
            sql_res = await execute_sql_task(item["query"])
            task_results["sql_task"] = sql_res
            hits = await search_similar(item["query"], collection_name="argo_knowledge", limit=2)
            task_results["rag_task"] = {"passages": hits}

        elif item["mode"] == "proximity":
            floats = nearest_floats(18.92, 72.83, limit=5)
            task_results["sql_task"] = {
                "sql": "SELECT * FROM v_latest_positions ORDER BY geom <-> ST_SetSRID(ST_MakePoint(72.83, 18.92), 4326) LIMIT 5;",
                "rows": floats,
            }
            hits = await search_similar(item["query"], collection_name="argo_knowledge", limit=2)
            task_results["rag_task"] = {"passages": hits}

        synth_res = await synthesize_answer(item["query"], task_results)
        print(synth_res.get("answer_markdown", synth_res.get("markdown", "")), flush=True)
        print(f"\n{'-' * 80}\n", flush=True)


if __name__ == "__main__":
    asyncio.run(run_demo())
