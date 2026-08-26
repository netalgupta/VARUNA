"""
FloatChat AI — SQL Extraction Utility

WHY a separate extractor?
  LLMs sometimes wrap SQL in markdown fences, add explanations before/after,
  or include multiple statements. This module robustly extracts exactly one
  clean SELECT from any LLM output.
"""
from __future__ import annotations
import re
from typing import Optional

SQL_FENCE  = re.compile(r"```(?:sql)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)
SELECT_RE  = re.compile(r"(?is)\b(?:SELECT|WITH)\b.+")
BANNED     = ("insert","update","delete","drop","alter","create",
              "grant","revoke","truncate","comment","attach")


def extract_sql(text: str) -> Optional[str]:
    """
    Extract a single clean SELECT or CTE query from LLM-generated text.
    Priority: fenced block > first SELECT/WITH occurrence.
    Returns None if no safe SELECT/WITH found.
    """
    if not text:
        return None
    t = text.strip()

    # Try fenced block first
    m = SQL_FENCE.search(t)
    cand = m.group(1).strip() if m else None

    # Fallback: first SELECT or WITH
    if not cand:
        m2 = SELECT_RE.search(t)
        if not m2:
            return None
        cand = m2.group(0).strip()

    # Strip anything after role markers or tool-call tokens
    for stop in ("\nAnswer:", "\nHuman:", "\nAssistant:", "\nExplanation:", "```", "<|tool_call", "<|im_end", "<|end", "')]"):
        cand = cand.split(stop)[0].strip()

    # Unescape any literal escape sequences from JSON/LLM output
    cand = cand.replace(r"\n", "\n").replace(r"\t", " ").replace(r"\'", "'").replace(r'\"', '"')
    # If a semicolon exists, take only the first statement
    cand = cand.split(";")[0].strip()
    cand = re.sub(r"['\"\)]+\]\}?$", "", cand).strip()
    low = cand.lower()

    if not (low.lstrip().startswith("select") or low.lstrip().startswith("with")):
        return None
    if any(b in low for b in BANNED):
        return None
    return cand


def sanitize_sql(sql: str) -> str:
    """
    Validate that the SQL query is a single, clean, safe SELECT statement.
    Raises ValueError if unsafe, non-SELECT, or contains chained statements.
    """
    extracted = extract_sql(sql)
    if not extracted:
        raise ValueError(f"Invalid or unsafe SQL query: '{sql[:100]}...' - must be a single SELECT statement.")
    return extracted

