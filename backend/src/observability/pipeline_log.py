"""
FloatChat AI — Per-Query Pipeline Trace Store

WHY store traces?
  The /debug/{trace_id} endpoint lets the frontend show a "RAG Debug Panel"
  showing every step: intent, retrieved chunks, scores, SQL, timing.
  This is what makes FloatChat feel like Palantir — full transparency.

WHY in-process LRU cache instead of Redis/DB?
  Traces are ephemeral — you only need them for the current session's
  debugging. Redis would add latency for what is essentially a dev tool.
  LRU of 500 traces = enough for a full lab session.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Any, Dict, Optional, List, Tuple

_TRACE_CACHE: OrderedDict[str, Any] = OrderedDict()
MAX_TRACES = 500


def store_trace(trace_id: str, trace_data: Dict[str, Any]) -> None:
    """Store a pipeline trace, evicting oldest if over limit."""
    if len(_TRACE_CACHE) >= MAX_TRACES:
        _TRACE_CACHE.popitem(last=False)  # remove oldest
    _TRACE_CACHE[trace_id] = trace_data


def get_trace(trace_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Retrieve a trace by ID. Returns None if not found."""
    if not trace_id:
        return None
    return _TRACE_CACHE.get(trace_id)


from itertools import islice

def list_recent_traces(n: int = 20) -> List[Dict[str, Any]]:
    """Get the N most recent trace summaries (for debug dashboard)."""
    items = list(_TRACE_CACHE.items())
    start_idx = max(0, len(items) - n)
    recent_items = list(islice(items, start_idx, len(items)))
    return [
        {
            "trace_id": tid,
            "query": "".join(islice(str(data.get("query", "")), 80)),
            "total_ms": data.get("total_ms"),
            "step_count": len(data.get("steps",[])),
        }
        for tid, data in reversed(recent_items)
    ]
