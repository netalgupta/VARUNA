"""
VARUNA — Multi-Agent Task DAG Orchestrator Engine
Decomposes compound natural language prompts into topological task graphs,
executes sub-agents in parallel asynchronous stages, and records execution telemetry.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field

from src.agents.sql_gen_agent import execute_sql_task
from src.agents.retrieval_agent import execute_retrieval_task
from src.agents.synthesizer_agent import synthesize_answer
from src.agents.biodiversity_agent import execute_biodiversity_task
from src.llm.openrouter_client import chat_complete
from src.config import settings
from src.observability.tracer import pipeline_span
from src.aegis.aegis_engine import run_aegis, build_evidence_context_for_synthesizer

log = logging.getLogger("varuna.orchestrator")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Task DAG Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TaskNode(BaseModel):
    task_id: str
    agent: str  # "SQL_GEN" | "BIODIVERSITY" | "RETRIEVAL" | "COMPARISON" | "SYNTHESIZER"
    params: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)


class ExecutionPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    tasks: List[TaskNode] = Field(default_factory=list)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Planner Prompt
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLANNER_SYSTEM_PROMPT = """You are the Lead Multi-Agent DAG Planner for the VARUNA Ocean Intelligence System.
Your job is to analyze the user's natural language question and decompose it into a JSON Execution Plan of sub-tasks.

AVAILABLE AGENTS:
1. SQL_GEN: Queries PostgreSQL public.marine_data for physical/chemical ocean float observations (temp, psal, doxy, chla, nitrate).
2. BIODIVERSITY: Queries CMLRE marine living resources (species taxonomy, thermal tolerances, occurrence records).
3. RETRIEVAL: Searches scientific oceanographic knowledge and literature.
4. SYNTHESIZER: Merges all upstream task results into a final grounded scientific answer.

OUTPUT FORMAT (Valid JSON only):
{
  "plan_id": "plan_unique_id",
  "tasks": [
    {
      "task_id": "task_01_sql",
      "agent": "SQL_GEN",
      "params": {"query_goal": "Query Arabian Sea temperature and dissolved oxygen last 6 months"},
      "dependencies": []
    },
    {
      "task_id": "task_02_bio",
      "agent": "BIODIVERSITY",
      "params": {"species": "Sardinella longiceps"},
      "dependencies": ["task_01_sql"]
    },
    {
      "task_id": "task_03_synth",
      "agent": "SYNTHESIZER",
      "params": {"format": "cited_markdown"},
      "dependencies": ["task_01_sql", "task_02_bio"]
    }
  ]
}
"""


async def plan_query(
    query: str,
    history: Optional[List[Dict[str, str]]] = None,
    trace: Optional[Any] = None,
) -> ExecutionPlan:
    """
    Prompts Nemotron-550B to compile a compound query into an ExecutionPlan DAG.
    """
    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {"role": "user", "content": f"Decompose this ocean query into an Execution Plan: {query}"},
    ]

    raw_plan = await chat_complete(messages, temperature=0.0, task_tag="planner", trace=trace)

    try:
        # Extract JSON from code blocks if present
        cleaned = raw_plan.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()

        data = json.loads(cleaned)
        return ExecutionPlan(**data)
    except Exception as e:
        log.warning("Plan parsing failed, building deterministic fallback DAG: %s", str(e))
        return _build_default_plan(query)


def _build_default_plan(query: str) -> ExecutionPlan:
    """Deterministic default plan fallback parameterized by user query."""
    ql = query.lower()
    is_compound = "vs" in ql or ("compare" in ql and ("arabian" in ql or "equator" in ql or "oxygen" in ql))
    has_bio = any(k in ql for k in ["sardine", "sardinella", "species", "coral", "tuna", "thunnus", "bleaching"]) or is_compound
    has_retrieval = any(k in ql for k in ["omz", "hypoxia", "heatwave", "thermal envelope", "plume", "upwelling", "freshwater", "oxygen"]) or is_compound

    tasks = [
        TaskNode(
            task_id="task_01_sql",
            agent="SQL_GEN",
            params={"query_goal": query},
            dependencies=[]
        )
    ]

    deps = ["task_01_sql"]

    if has_retrieval:
        tasks.append(
            TaskNode(
                task_id="task_02_retrieval",
                agent="RETRIEVAL",
                params={"query": query},
                dependencies=[]
            )
        )
        deps.append("task_02_retrieval")

    if has_bio:
        species_name = "Sardinella longiceps"
        if "tuna" in ql or "thunnus" in ql:
            species_name = "Thunnus albacares"
        elif "coral" in ql or "acropora" in ql:
            species_name = "Acropora millepora"

        tasks.append(
            TaskNode(
                task_id="task_03_bio",
                agent="BIODIVERSITY",
                params={"species": species_name, "query": query},
                dependencies=["task_01_sql"]
            )
        )
        deps.append("task_03_bio")

    tasks.append(
        TaskNode(
            task_id="task_04_synthesize",
            agent="SYNTHESIZER",
            params={"goal": "Synthesize scientific findings from real data", "query": query},
            dependencies=deps
        )
    )

    return ExecutionPlan(tasks=tasks)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Topological Execution Loop
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _get_topological_stages(plan: ExecutionPlan) -> List[List[TaskNode]]:
    """
    Partitions tasks into parallel execution stages using topological dependency levels.
    """
    task_map = {t.task_id: t for t in plan.tasks}
    in_degree = {t.task_id: len(t.dependencies) for t in plan.tasks}
    dependents: Dict[str, List[str]] = {t.task_id: [] for t in plan.tasks}

    for t in plan.tasks:
        for dep in t.dependencies:
            if dep in dependents:
                dependents[dep].append(t.task_id)

    stages: List[List[TaskNode]] = []
    ready = [task_map[tid] for tid, deg in in_degree.items() if deg == 0]

    visited_count = 0
    while ready:
        stages.append(ready)
        next_ready = []
        for node in ready:
            visited_count += 1
            for child_id in dependents[node.task_id]:
                in_degree[child_id] -= 1
                if in_degree[child_id] == 0:
                    next_ready.append(task_map[child_id])
        ready = next_ready

    if visited_count < len(plan.tasks):
        log.warning("Cycle detected in ExecutionPlan DAG! Falling back to sequential execution.")
        return [[t] for t in plan.tasks]

    return stages


async def plan_and_execute(
    query: str,
    session_id: str = "default",
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    event_bus: Optional[Any] = None,  # PipelineEventBus | None
) -> Any:
    """
    End-to-end execution of compound query via Multi-Agent Task DAG.
    Captures granular per-phase latency breakdown.
    """
    trace_id = str(uuid.uuid4())
    start_total = time.perf_counter()

    with pipeline_span(trace_id, query) as trace:
        # Step 1: Decompose query into Task DAG (Planner LLM call)
        t_plan = time.perf_counter()
        if event_bus:
            await event_bus.emit("pipeline_step", {
                "stage": "PLANNER",
                "status": "RUNNING",
                "message": "LLM decomposing query into Task DAG...",
            })
        plan = await plan_query(query, trace=trace)
        planner_latency_ms = round((time.perf_counter() - t_plan) * 1000.0, 1)
        stages = _get_topological_stages(plan)
        if event_bus:
            await event_bus.emit("pipeline_step", {
                "stage": "PLANNER",
                "status": "DONE",
                "message": f"Plan compiled: {len(plan.tasks)} tasks across {len(stages)} parallel stages",
                "plan_id": plan.plan_id,
                "task_ids": [t.task_id for t in plan.tasks],
                "duration_ms": planner_latency_ms,
            })

        task_results: Dict[str, Any] = {}
        execution_steps = []

        # Step 2: Execute stages topologically (parallel level execution)
        for stage_idx, stage_nodes in enumerate(stages):
            trace.log("DAG_STAGE", f"Executing Stage {stage_idx + 1} ({len(stage_nodes)} parallel tasks)")

            async def _run_single_task(node: TaskNode) -> tuple[str, Dict[str, Any], float]:
                t0 = time.perf_counter()
                res: Dict[str, Any] = {}

                if event_bus:
                    await event_bus.emit("pipeline_step", {
                        "stage": node.agent,
                        "task_id": node.task_id,
                        "status": "RUNNING",
                        "message": f"{node.agent} agent started",
                        "params": node.params,
                    })

                try:
                    if node.agent == "SQL_GEN":
                        res = await execute_sql_task(node.params.get("query_goal", query), params=node.params, trace=trace)
                        if event_bus and res.get("sql"):
                            await event_bus.emit("sql", res["sql"])
                        if event_bus and res.get("rows"):
                            await event_bus.emit("rows", res["rows"][:50])
                    elif node.agent == "RETRIEVAL":
                        res = await execute_retrieval_task(node.params.get("query", query), params=node.params, trace=trace)
                    elif node.agent == "BIODIVERSITY":
                        res = await execute_biodiversity_task(
                            node.params.get("query", query),
                            params=node.params,
                            trace=trace,
                        )
                        if event_bus and res.get("rows"):
                            await event_bus.emit("bio_rows", res["rows"][:20])
                        if event_bus and res.get("stress_flags"):
                            await event_bus.emit("pipeline_step", {
                                "stage": "BIODIVERSITY",
                                "task_id": node.task_id,
                                "status": "DONE",
                                "message": f"Found {len(res.get('rows',[]))} bio co-locations | {len(res.get('stress_flags',[]))} stress flags",
                            })
                    elif node.agent == "SYNTHESIZER":
                        res = await synthesize_answer(query, task_results=task_results, trace=trace)
                    else:
                        res = {"status": "SKIPPED", "agent": node.agent}
                except Exception as e:
                    log.error("Task failed: %s", node.task_id, exc_info=True)
                    res = {"error": str(e), "status": "FAILED"}

                dur_ms = (time.perf_counter() - t0) * 1000.0
                if event_bus:
                    await event_bus.emit("pipeline_step", {
                        "stage": node.agent,
                        "task_id": node.task_id,
                        "status": "FAILED" if "error" in res else "DONE",
                        "message": f"{node.agent} completed in {dur_ms:.0f}ms",
                        "duration_ms": round(dur_ms, 1),
                        "row_count": res.get("row_count", len(res.get("rows", []))),
                    })
                return node.task_id, res, dur_ms

            # Run all tasks in current stage concurrently
            results = await asyncio.gather(*[_run_single_task(n) for n in stage_nodes])

            for tid, result_data, duration_ms in results:
                task_results[tid] = result_data
                step_entry = {
                    "task_id": tid,
                    "agent_type": next((n.agent for n in stage_nodes if n.task_id == tid), "UNKNOWN"),
                    "description": f"Executed {tid}",
                    "status": "COMPLETED" if "error" not in result_data else "FAILED",
                    "duration_ms": round(duration_ms, 1),
                    "result_summary": f"Returned {result_data.get('row_count', len(result_data))} items",
                }
                # Attach sub-agent internal latency breakdown if available
                if isinstance(result_data, dict) and "latency" in result_data:
                    step_entry["latency_breakdown"] = result_data["latency"]
                execution_steps.append(step_entry)

        # Step 3: Run AEGIS guardrail engine before synthesis
        _sql_rows: list = []
        _bio_rows: list = []
        _species_profiles: list = []
        _taxonomy_records: list = []
        _rag_texts: list = []
        for _res in task_results.values():
            if isinstance(_res, dict):
                _sql_rows.extend(_res.get("rows") or [])
                _bio_rows.extend(_res.get("bio_matches") or [])
                _species_profiles.extend(_res.get("species_profiles") or [])
                _taxonomy_records.extend(_res.get("taxonomy_records") or [])
                _rag_texts.extend(_res.get("retrieved_texts") or [])

        t_aegis = time.perf_counter()
        aegis_result = await run_aegis(
            question=query,
            sql_rows=_sql_rows,
            bio_matches=_bio_rows,
            species_profiles=_species_profiles,
            taxonomy_records=_taxonomy_records,
            rag_texts=_rag_texts,
        )
        aegis_context = build_evidence_context_for_synthesizer(aegis_result)
        aegis_latency_ms = round((time.perf_counter() - t_aegis) * 1000.0, 1)
        log.info(
            "AEGIS completed in %.0fms — %d approved, %d rejected, %d background, %d warnings",
            aegis_latency_ms,
            len(aegis_result.approved_claims),
            len(aegis_result.rejected_claims),
            len(aegis_result.background_claims),
            len(aegis_result.warnings),
        )
        if event_bus:
            await event_bus.emit("pipeline_step", {
                "stage": "AEGIS",
                "status": "DONE",
                "message": aegis_result.summary_line(),
                "duration_ms": aegis_latency_ms,
                "flags": aegis_result.flags,
                "rejected_count": len(aegis_result.rejected_claims),
            })

        # Step 4: Extract final synthesized result (AEGIS-gated)
        final_synth = None
        for tid, res in task_results.items():
            if isinstance(res, dict) and "answer_markdown" in res:
                final_synth = res
                break

        synthesizer_latency_ms = 0.0
        if not final_synth:
            t_synth = time.perf_counter()
            final_synth = await synthesize_answer(
                query,
                task_results=task_results,
                aegis_context=aegis_context,
                trace=trace,
            )
            synthesizer_latency_ms = round((time.perf_counter() - t_synth) * 1000.0, 1)

        total_ms = (time.perf_counter() - start_total) * 1000.0

        # Build comprehensive latency breakdown
        latency_breakdown = {
            "total_ms": round(total_ms, 1),
            "planner_llm_ms": planner_latency_ms,
            "stages": [],
        }
        for step in execution_steps:
            stage_entry = {
                "task_id": step["task_id"],
                "agent_type": step["agent_type"],
                "total_ms": step["duration_ms"],
            }
            if "latency_breakdown" in step:
                stage_entry.update(step["latency_breakdown"])
            latency_breakdown["stages"].append(stage_entry)
        if synthesizer_latency_ms > 0:
            latency_breakdown["final_synthesizer_llm_ms"] = synthesizer_latency_ms

        agent_trace_payload = {
            "plan_id": plan.plan_id,
            "total_latency_ms": round(total_ms, 1),
            "planner_model": settings.openrouter_model,
            "tasks": execution_steps,
            "topological_order": [t["task_id"] for t in execution_steps],
            "latency_breakdown": latency_breakdown,
        }

        from src.api.routes import ChatOut
        return ChatOut(
            ok=True,
            answer_markdown=final_synth.get("answer_markdown"),
            sql=final_synth.get("sql"),
            rows=final_synth.get("rows"),
            viz_specs=final_synth.get("viz_specs"),
            float_ids=final_synth.get("float_ids"),
            agent_trace=agent_trace_payload,
            intent="MULTI_AGENT_DAG",
            trace_id=trace_id,
        )

