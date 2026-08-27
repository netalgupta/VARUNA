"""
FloatChat AI — Structured Pipeline Logger

WHY structlog + rich?
  - structlog gives JSON-serializable log events with bound context (trace_id, model, etc.)
  - rich renders beautiful colored console output with emoji stage indicators
  - Every RAG step is logged with timing so you can see exactly where latency is

The terminal output looks like:
  🔍 [QUERY]       user asked: "show salinity near Mumbai past 30 days"
  ✏️  [REWRITE]     rewritten: "salinity profiles within 200km of Mumbai (19.08°N 72.88°E) last 30 days"
  🧠 [INTENT]      SQL_DATA (confidence: high)
  🔎 [BM25]        top score: 0.847 | "Arabian Sea salinity seasonal patterns..."
  📐 [VECTOR]      top score: 0.912 | chunk_id: argo_meta_0042
  🏆 [RERANK]      reranked 12 → top 5 chunks
  🗄️  [SQL_GEN]     generated SELECT in 1.2s
  ✅ [SQL_EXEC]    45 rows in 0.08s
  📝 [NARRATE]     narration in 0.9s
  📦 [RESPONSE]    total pipeline: 2.4s
"""
from __future__ import annotations

import time
import json
import logging
from typing import Any, Dict, Optional, cast
from contextlib import contextmanager

try:
    import structlog  # type: ignore
    _has_structlog = True
except ImportError:
    structlog = None  # type: ignore
    _has_structlog = False

try:
    from rich.console import Console  # type: ignore
    from rich.theme import Theme  # type: ignore
    _theme = Theme({
        "query":   "bold cyan",
        "rewrite": "bold blue",
        "intent":  "bold magenta",
        "bm25":    "yellow",
        "vector":  "green",
        "rerank":  "bold green",
        "sql":     "bold yellow",
        "exec":    "cyan",
        "narrate": "blue",
        "memory":  "dim white",
        "kg":      "magenta",
        "response":"bold white",
        "error":   "bold red",
        "warn":    "bold orange3",
        "info":    "dim white",
    })
    console = Console(stderr=True, theme=_theme)
except ImportError:
    class _MockConsole:
        def print(self, *args, **kwargs): pass
        def rule(self, *args, **kwargs): pass
    console = _MockConsole()

# ── structlog setup ───────────────────────────────────────────────────────────
if _has_structlog:
    slog = cast(Any, structlog)
    slog.configure(
        processors=[
            slog.contextvars.merge_contextvars,
            slog.processors.add_log_level,
            slog.processors.TimeStamper(fmt="iso"),
            slog.processors.JSONRenderer(),
        ],
        logger_factory=slog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    _log = slog.get_logger("floatchat")
else:
    _log = logging.getLogger("floatchat")


# ── Stage emitters ────────────────────────────────────────────────────────────
STAGES = {
    "QUERY":    ("🔍", "query"),
    "REWRITE":  ("✏️ ", "rewrite"),
    "INTENT":   ("🧠", "intent"),
    "DECOMPOSE":("🔀", "intent"),
    "BM25":     ("🔎", "bm25"),
    "VECTOR":   ("📐", "vector"),
    "RERANK":   ("🏆", "rerank"),
    "CONTEXT":  ("📋", "rerank"),
    "SQL_GEN":  ("🗄️ ", "sql"),
    "SQL_EXEC": ("✅", "exec"),
    "NARRATE":  ("📝", "narrate"),
    "MEMORY":   ("💾", "memory"),
    "KG":       ("🕸️ ", "kg"),
    "RESPONSE": ("📦", "response"),
    "ERROR":    ("❌", "error"),
    "WARN":     ("⚠️ ", "warn"),
}


def _emit(stage: str, msg: str, data: Optional[Dict[str, Any]] = None, elapsed_ms: Optional[float] = None):
    icon, style = STAGES.get(stage, ("·", "info"))
    timing = f"  [{elapsed_ms:.0f}ms]" if elapsed_ms is not None else ""
    console.print(f"  {icon} [{stage:<8}]{timing}  {msg}", style=style)
    # Automatically log long messsages if they exist in data/kwargs
    if data:
        # Log structured data to JSON log (not shown in console unless debug)
        _log.debug(stage.lower(), **data)


# ── Pipeline trace accumulator ────────────────────────────────────────────────
class PipelineTrace:
    """
    Accumulates all steps for a single query.
    Returned in /debug endpoint and stored in query_feedback.
    """
    def __init__(self, trace_id: str, query: str):
        self.trace_id = trace_id
        self.query = query
        self.steps: list = []
        self._start = time.perf_counter()

    def log(self, stage: str, message: str, **kwargs):
        elapsed = (time.perf_counter() - self._start) * 1000.0
        self.steps.append({
            "stage": stage,
            "message": message,
            "elapsed_ms": float(round(elapsed)),
            **kwargs,
        })
        _emit(stage, message, kwargs if kwargs else None, elapsed)

    def total_ms(self) -> float:
        return (time.perf_counter() - self._start) * 1000.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "query": self.query,
            "total_ms": float(round(self.total_ms())),
            "steps": self.steps,
        }


@contextmanager
def pipeline_span(trace_id: str, query: str):
    """Context manager that prints a header/footer for a query pipeline."""
    tid_str = str(trace_id)[:8] if trace_id else "unknown"  # type: ignore
    console.rule(f"[bold cyan]🌊 FloatChat Pipeline  trace={tid_str}[/bold cyan]")
    console.print(f"  [query]Query:[/query] {query!r}")
    trace = PipelineTrace(trace_id, query)
    try:
        yield trace
    finally:
        console.rule(f"[dim]Pipeline complete — {trace.total_ms():.0f}ms[/dim]")
