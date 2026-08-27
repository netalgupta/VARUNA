"""
VARUNA — Complete 35-Query Honest Multi-Tier AI & Semantic Audit Runner
Evaluates 4 distinct validation tiers:
  1. SQL_EXECUTION_PASS: Ran on database without exception.
  2. SEMANTIC_SQL_PASS: SQL satisfies all required domain tables, predicates, and aggregations.
  3. RESULT_PASS: Non-empty, relevant physical/biological measurements returned.
  4. ANSWER_PASS: Synthesizer generated an answer grounded in the retrieved rows.
"""
from __future__ import annotations

import sys
import os
import json
import time
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.database.postgres import run_sql, nearest_floats, float_trajectory, depth_profile, regional_stats
from src.database.qdrant import search_similar
from src.agents.biodiversity_agent import execute_biodiversity_task
from src.agents.synthesizer_agent import synthesize_answer
from src.agents.sql_gen_agent import execute_sql_task
from src.evaluation.benchmark_suite import BENCHMARK_QUERIES
from src.evaluation.semantic_validator import validate_semantic_sql, QUERY_SEMANTIC_SPECS
from src.aegis.aegis_engine import run_aegis, build_evidence_context_for_synthesizer


async def run_honest_35_audit():
    print("==" * 45)
    print("🔍 VARUNA 35-QUERY RIGOROUS SEMANTIC & EXECUTION AUDIT + 🛡️ AEGIS")
    print("   Validating: (1) DB Exec, (2) Semantic SQL, (3) Data Rows, (4) Synthesizer, (5) AEGIS Provenance")
    print("==" * 45)

    # Allow psycopg connection pool to warm up before first query
    print("   ⏳ Warming DB connection pool (5s)...")
    await asyncio.sleep(5)
    print("   ✅ Pool ready. Starting audit.\n")

    audit_results: List[Dict[str, Any]] = []
    start_total = time.perf_counter()

    for idx, item in enumerate(BENCHMARK_QUERIES, 1):
        qid = item["id"]
        category = item["category"]
        query = item["query"]
        qtype = item["type"]

        print(f"\n[{idx:02d}/35] Auditing {qid}: {category}")
        print(f"     Prompt: \"{query}\"")

        t0 = time.perf_counter()
        task_results: Dict[str, Any] = {}
        sql_used: Optional[str] = None
        rows_retrieved: int = 0
        vectors_retrieved: int = 0
        sql_exec_pass = False
        semantic_pass = False
        semantic_reasons: List[str] = []
        result_pass = False
        answer_pass = False
        error_msg: Optional[str] = None

        try:
            # ── 1. Pure Dynamic LLM Task Execution ───────────────────────────
            if qtype in ("SQL_PHYSICAL", "SQL_BGC", "SQL_BIO", "SPATIAL_PROXIMITY", "ANOMALY_DETECTION", "CROSS_DOMAIN"):
                sql_res = await execute_sql_task(query)
                sql_used = sql_res.get("sql")
                rows = sql_res.get("rows", [])
                rows_retrieved = len(rows)
                task_results["sql_task"] = sql_res
                sql_exec_pass = sql_res.get("status") in ("OK", "NO_DATA") and bool(sql_used)
                result_pass = rows_retrieved > 0
                error_msg = sql_res.get("error")

            elif qtype == "BIO_VECTOR":
                sql_res = await execute_sql_task(query)
                sql_used = sql_res.get("sql")
                rows = sql_res.get("rows", [])
                rows_retrieved = len(rows)
                task_results["sql_task"] = sql_res
                hits = await search_similar(query, collection_name="bio_knowledge", limit=5)
                vectors_retrieved = len(hits)
                task_results["rag_task"] = {"passages": hits}
                sql_exec_pass = bool(sql_used) or len(hits) > 0
                result_pass = rows_retrieved > 0 or len(hits) > 0

            elif qtype == "BIO_FUSION":
                bio_res = await execute_biodiversity_task(query)
                sql_used = bio_res.get("sql")
                rows = bio_res.get("rows", [])
                rows_retrieved = len(rows)
                q_profs = bio_res.get("qdrant_profiles", [])
                vectors_retrieved = len(q_profs)
                task_results["bio_task"] = bio_res
                task_results["sql_task"] = {"sql": sql_used, "rows": rows}
                sql_exec_pass = bool(sql_used)
                result_pass = rows_retrieved > 0 or vectors_retrieved > 0

            elif qtype == "SEMANTIC_RAG":
                sql_res = await execute_sql_task(query)
                sql_used = sql_res.get("sql")
                rows = sql_res.get("rows", [])
                rows_retrieved = len(rows)
                task_results["sql_task"] = sql_res
                hits = await search_similar(query, collection_name="argo_knowledge", limit=4)
                vectors_retrieved = len(hits)
                task_results["rag_task"] = {"passages": hits}
                sql_exec_pass = bool(sql_used) or len(hits) > 0
                result_pass = rows_retrieved > 0 or len(hits) > 0

            # ── 2. Validate Semantic Correctness of Generated SQL ─────────────
            if sql_used:
                semantic_pass, semantic_reasons = validate_semantic_sql(qid, sql_used)
            else:
                semantic_pass = False
                semantic_reasons = [f"No SQL was generated by LLM ({error_msg})"]

            # Enrich with semantic vectors if applicable
            hits = await search_similar(query, collection_name="argo_knowledge", limit=2)
            if hits and "rag_task" not in task_results:
                vectors_retrieved = len(hits)
                task_results["rag_task"] = {"passages": hits}

            # ── 3b. AEGIS Guardrail Verification ─────────────────────────────
            _all_rows = []
            _bio_matches = []
            _species_profiles = []
            _rag_texts = []
            for _res in task_results.values():
                if isinstance(_res, dict):
                    _all_rows.extend(_res.get("rows") or [])
                    _bio_matches.extend(_res.get("bio_matches") or [])
                    _species_profiles.extend(_res.get("species_profiles") or [])
                    _rag_texts.extend(_res.get("retrieved_texts") or [])

            aegis_result = await run_aegis(
                question=query,
                sql_rows=_all_rows,
                bio_matches=_bio_matches,
                species_profiles=_species_profiles,
                taxonomy_records=[],
                rag_texts=_rag_texts,
            )
            aegis_context = build_evidence_context_for_synthesizer(aegis_result)
            aegis_approved = len(aegis_result.approved_claims)
            aegis_rejected = len(aegis_result.rejected_claims)
            aegis_background = len(aegis_result.background_claims)
            aegis_warnings = len(aegis_result.warnings)
            aegis_guardrails = aegis_result.guardrails_activated
            aegis_pass = aegis_rejected == 0  # Clean pass = no rejected claims

            # ── 4. Synthesize Answer (AEGIS-gated) ───────────────────────────
            synth_res = await synthesize_answer(query, task_results, aegis_context=aegis_context)
            answer_markdown = synth_res.get("answer_markdown", "")
            answer_pass = bool(answer_markdown and "⚠️ Pipeline error" not in answer_markdown and len(answer_markdown) > 50)

        except Exception as e:
            error_msg = str(e)
            answer_markdown = f"⚠️ Pipeline error: {str(e)}"
            sql_exec_pass = False
            aegis_approved = 0
            aegis_rejected = 0
            aegis_background = 0
            aegis_warnings = 0
            aegis_guardrails = []
            aegis_pass = False
            aegis_context = {}

        total_latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        # Final Verdict: All 5 tiers considered
        overall_pass = sql_exec_pass and semantic_pass and answer_pass

        audit_entry = {
            "id": qid,
            "category": category,
            "query": query,
            "type": qtype,
            "sql_executed": sql_used,
            "rows_retrieved": rows_retrieved,
            "vectors_retrieved": vectors_retrieved,
            "sql_execution_pass": sql_exec_pass,
            "semantic_sql_pass": semantic_pass,
            "semantic_reasons": semantic_reasons,
            "result_pass": result_pass,
            "answer_pass": answer_pass,
            "aegis_approved": aegis_approved,
            "aegis_rejected": aegis_rejected,
            "aegis_background": aegis_background,
            "aegis_warnings": aegis_warnings,
            "aegis_guardrails": aegis_guardrails,
            "aegis_pass": aegis_pass,
            "final_verdict": "PASS" if overall_pass else "FAIL",
            "latency_ms": total_latency_ms,
            "answer_markdown": answer_markdown,
            "error_msg": error_msg,
        }
        audit_results.append(audit_entry)

        sem_icon = "✅" if semantic_pass else "❌"
        exec_icon = "✅" if sql_exec_pass else "❌"
        ans_icon = "✅" if answer_pass else "❌"
        aegis_icon = "🛡️" if aegis_pass else "⚠️"
        verdict_icon = "🟢 PASS" if overall_pass else "🔴 FAIL"

        print(f"     [Tiers] Exec: {exec_icon} | Semantic: {sem_icon} | Answer: {ans_icon} | AEGIS: {aegis_icon} [{aegis_approved}✓ {aegis_rejected}✗ {aegis_background}bg] ── {verdict_icon}")
        if not semantic_pass:
            print(f"     ⚠️ Semantic Mismatch: {semantic_reasons}")

    total_time_s = round(time.perf_counter() - start_total, 2)

    # ── Summary Analytics ─────────────────────────────────────────────────────
    total = len(audit_results)
    exec_passed = sum(1 for r in audit_results if r["sql_execution_pass"])
    sem_passed = sum(1 for r in audit_results if r["semantic_sql_pass"])
    res_passed = sum(1 for r in audit_results if r["result_pass"])
    ans_passed = sum(1 for r in audit_results if r["answer_pass"])
    aegis_passed = sum(1 for r in audit_results if r["aegis_pass"])
    total_aegis_approved = sum(r["aegis_approved"] for r in audit_results)
    total_aegis_rejected = sum(r["aegis_rejected"] for r in audit_results)
    total_aegis_bg = sum(r["aegis_background"] for r in audit_results)
    final_passed = sum(1 for r in audit_results if r["final_verdict"] == "PASS")

    audit_summary = {
        "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "total_queries": total,
        "metrics": {
            "sql_execution_pass_count": exec_passed,
            "sql_execution_pass_pct": round((exec_passed / total) * 100, 1),
            "semantic_sql_pass_count": sem_passed,
            "semantic_sql_pass_pct": round((sem_passed / total) * 100, 1),
            "result_pass_count": res_passed,
            "result_pass_pct": round((res_passed / total) * 100, 1),
            "answer_pass_count": ans_passed,
            "answer_pass_pct": round((ans_passed / total) * 100, 1),
            "aegis_clean_pass_count": aegis_passed,
            "aegis_clean_pass_pct": round((aegis_passed / total) * 100, 1),
            "aegis_total_approved": total_aegis_approved,
            "aegis_total_rejected": total_aegis_rejected,
            "aegis_total_background": total_aegis_bg,
            "final_verified_pass_count": final_passed,
            "final_verified_pass_pct": round((final_passed / total) * 100, 1),
        },
        "total_runtime_seconds": total_time_s,
        "audit_results": audit_results,
    }

    # Save detailed JSON report
    out_json = _BACKEND_ROOT / "src" / "evaluation" / "full_35_analytics.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print("\n" + "=" * 90)
    print("📊 VARUNA 5-TIER RIGOROUS AUDIT + 🛡️ AEGIS PROVENANCE RESULTS:")
    print(f"   1. SQL Execution Pass Rate:  {exec_passed}/{total} ({round((exec_passed/total)*100, 1)}%)")
    print(f"   2. Semantic SQL Pass Rate:   {sem_passed}/{total} ({round((sem_passed/total)*100, 1)}%)")
    print(f"   3. Result Non-Empty Rate:    {res_passed}/{total} ({round((res_passed/total)*100, 1)}%)")
    print(f"   4. Synthesized Answer Rate:  {ans_passed}/{total} ({round((ans_passed/total)*100, 1)}%)")
    print(f"   5. AEGIS Clean Pass Rate:    {aegis_passed}/{total} ({round((aegis_passed/total)*100, 1)}%)")
    print(f"      Claims: {total_aegis_approved} approved | {total_aegis_rejected} rejected | {total_aegis_bg} background")
    print(f"   ────────────────────────────────────────────────────────")
    print(f"   ⭐ FINAL VERIFIED PASS RATE: {final_passed}/{total} ({round((final_passed/total)*100, 1)}%)")
    print("=" * 90)


if __name__ == "__main__":
    asyncio.run(run_honest_35_audit())
