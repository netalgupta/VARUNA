"""
Unit tests for OpenRouter Client and offline fallback mechanism.
"""

import pytest
from src.llm.openrouter_client import chat_complete, embed_texts, _offline_chat_fallback


@pytest.mark.asyncio
async def test_offline_chat_fallback_planner():
    messages = [{"role": "user", "content": "Decompose: Compare Arabian Sea vs Equator"}]
    res = await chat_complete(messages, task_tag="planner")
    assert "tasks" in res or "plan" in res.lower()
    assert "task_01_sql" in res


@pytest.mark.asyncio
async def test_offline_chat_fallback_sql():
    messages = [{"role": "user", "content": "Query temperature for float 1902303"}]
    res = await chat_complete(messages, task_tag="sql_gen")
    assert "SELECT" in res.upper()


@pytest.mark.asyncio
async def test_offline_chat_fallback_synthesizer():
    messages = [{"role": "user", "content": "Synthesize summary"}]
    res = await chat_complete(messages, task_tag="synthesizer")
    assert "Marine Ecosystem Assessment" in res
    assert "ARGO" in res


@pytest.mark.asyncio
async def test_embed_texts_dimension():
    texts = ["Arabian Sea salinity profile", "Gulf of Mannar coral bleaching"]
    vectors = await embed_texts(texts)
    assert len(vectors) == 2
    assert len(vectors[0]) == 768
    assert len(vectors[1]) == 768
