"""
Unit tests for API request/response schemas and serialization models.
"""
from __future__ import annotations
import pytest
from src.api.routes import ChatIn, ChatOut

def test_chat_in_aliases():
    # User submits 'question'
    c1 = ChatIn(question="Find nearest floats to Mumbai")
    assert c1.question == "Find nearest floats to Mumbai"

    # User submits 'query' alias
    c2 = ChatIn(query="Temperature profile in Arabian Sea")
    assert c2.query == "Temperature profile in Arabian Sea"

    # Coordinates
    c3 = ChatIn(question="Nearest float", user_lat=18.9, user_lon=72.8)
    assert c3.user_lat == 18.9
    assert c3.user_lon == 72.8

def test_chat_out_defaults():
    out = ChatOut(
        ok=True,
        answer_markdown="### Ocean Assessment\nNormal conditions.",
        sql="SELECT * FROM public.marine_data LIMIT 10;",
        rows=[{"temp": 28.5, "psal": 35.2}],
        viz_specs={"chart_type": "time_series"}
    )
    assert out.ok is True
    assert out.answer_markdown is not None and "Ocean Assessment" in out.answer_markdown
    assert out.rows is not None and len(out.rows) == 1
    assert out.viz_specs is not None and out.viz_specs["chart_type"] == "time_series"
