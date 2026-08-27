"""
Unit tests for Multi-Agent Task DAG Orchestrator and topological execution.
"""

import pytest
from src.agents.orchestrator import (
    ExecutionPlan,
    TaskNode,
    _get_topological_stages,
    _build_default_plan,
    plan_and_execute,
)


def test_topological_stages_partitioning():
    plan = ExecutionPlan(
        tasks=[
            TaskNode(task_id="t1", agent="SQL_GEN", dependencies=[]),
            TaskNode(task_id="t2", agent="SQL_GEN", dependencies=[]),
            TaskNode(task_id="t3", agent="BIODIVERSITY", dependencies=["t1"]),
            TaskNode(task_id="t4", agent="SYNTHESIZER", dependencies=["t1", "t2", "t3"]),
        ]
    )

    stages = _get_topological_stages(plan)
    assert len(stages) == 3

    # Stage 0: independent tasks t1 and t2
    stage_0_ids = {t.task_id for t in stages[0]}
    assert stage_0_ids == {"t1", "t2"}

    # Stage 1: t3 (depends on t1)
    stage_1_ids = {t.task_id for t in stages[1]}
    assert stage_1_ids == {"t3"}

    # Stage 2: t4 (depends on all)
    stage_2_ids = {t.task_id for t in stages[2]}
    assert stage_2_ids == {"t4"}


def test_build_default_compound_plan():
    plan = _build_default_plan("Compare dissolved oxygen in Arabian Sea vs Equator and show sardines")
    assert len(plan.tasks) == 4
    task_agents = [t.agent for t in plan.tasks]
    assert "SQL_GEN" in task_agents
    assert "BIODIVERSITY" in task_agents
    assert "SYNTHESIZER" in task_agents


@pytest.mark.asyncio
async def test_end_to_end_plan_and_execute():
    res = await plan_and_execute("Compare BGC in Arabian Sea vs Equator last 6 months")
    assert res.ok is True
    assert res.answer_markdown is not None
    assert res.agent_trace is not None
    assert "nemotron" in res.agent_trace.planner_model.lower()
