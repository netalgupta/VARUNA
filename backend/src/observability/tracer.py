"""
In-process telemetry and pipeline trace accumulator for VARUNA.
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

_TRACE_STORE: Dict[str, Dict[str, Any]] = {}


def store_trace(trace_id: str, trace_data: Dict[str, Any]) -> None:
    """Store a pipeline trace in in-process memory buffer."""
    _TRACE_STORE[trace_id] = trace_data


def get_trace(trace_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a pipeline trace by ID."""
    return _TRACE_STORE.get(trace_id)


class PipelineSpan:
    """Accumulates step-by-step timings and data payloads for a single query."""

    def __init__(self, trace_id: str, query: str):
        self.trace_id = trace_id
        self.query = query
        self.steps: List[Dict[str, Any]] = []
        self._start = time.perf_counter()

    def log(self, stage: str, message: str, **kwargs) -> None:
        elapsed = (time.perf_counter() - self._start) * 1000.0
        self.steps.append({
            "stage": stage,
            "message": message,
            "elapsed_ms": round(elapsed, 2),
            **kwargs,
        })

    def total_ms(self) -> float:
        return (time.perf_counter() - self._start) * 1000.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "query": self.query,
            "total_ms": round(self.total_ms(), 2),
            "steps": self.steps,
        }


@contextmanager
def pipeline_span(trace_id: str, query: str):
    """Context manager for tracing query execution spans."""
    span = PipelineSpan(trace_id, query)
    try:
        yield span
    finally:
        store_trace(trace_id, span.to_dict())
