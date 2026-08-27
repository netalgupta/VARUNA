"""
FloatChat AI — Redis-Backed Conversation Memory

WHY Redis instead of in-memory deque?
  The old code used defaultdict(deque) — memory dies on every server restart,
  and can't be shared across multiple API processes (can't scale horizontally).

  Redis:
  - Persists across restarts (AOF or RDB snapshot)
  - Can be accessed by multiple API replicas (scale out)
  - TTL support: sessions auto-expire after N days (no manual cleanup)
  - RESP3 binary protocol: fast serialization

WHY 20-turn window?
  Most LLMs have 8K-128K context limits. Keeping the full history would
  eventually overflow and cause truncation bugs. 20 turns = enough for
  meaningful multi-turn oceanographic exploration sessions.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import redis  # type: ignore
    _has_redis = True
except ImportError:
    redis = None  # type: ignore
    _has_redis = False

from src.config import settings  # type: ignore

# ── Redis connection (lazy singleton) ─────────────────────────────────────────
_redis: Optional[Any] = None
_IN_MEM_SESSIONS: Dict[str, List[Dict[str, str]]] = {}


def get_redis() -> Optional[Any]:
    global _redis
    if not _has_redis:
        return None
    if _redis is None and redis is not None:
        try:
            _redis = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                health_check_interval=30,
            )
        except Exception:
            _redis = None
    return _redis


SESSION_PREFIX = "floatchat:session:"
SESSION_TTL    = 60 * 60 * 24 * 7  # 7 days TTL
MAX_TURNS      = 20                 # keep last 20 turns


def _key(session_id: str) -> str:
    return f"{SESSION_PREFIX}{session_id}"


def get_history(session_id: str) -> List[Dict[str, str]]:
    """Retrieve conversation history as list of {role, content} dicts."""
    try:
        r = get_redis()
        if r is not None:
            raw = r.get(_key(session_id))
            if raw:
                data = json.loads(raw)
                return data.get("messages", [])
        return _IN_MEM_SESSIONS.get(session_id, [])
    except Exception:
        return _IN_MEM_SESSIONS.get(session_id, [])


def append_message(session_id: str, role: str, content: str) -> None:
    """Append a message and trim to MAX_TURNS. Refreshes TTL."""
    # Maintain in-memory buffer
    if session_id not in _IN_MEM_SESSIONS:
        _IN_MEM_SESSIONS[session_id] = []
    _IN_MEM_SESSIONS[session_id].append({"role": role, "content": content})
    if len(_IN_MEM_SESSIONS[session_id]) > MAX_TURNS:
        _IN_MEM_SESSIONS[session_id] = _IN_MEM_SESSIONS[session_id][-MAX_TURNS:]

    try:
        r = get_redis()
        if r is not None:
            raw = r.get(_key(session_id))
            parsed = json.loads(raw) if raw else None
            data: Dict[str, Any] = dict(parsed) if parsed else {
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "messages": [],
            }
            data["messages"].append({"role": role, "content": content})
            msgs = list(data["messages"])
            start_idx = max(0, len(msgs) - MAX_TURNS)
            data["messages"] = msgs[start_idx:]
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            r.setex(_key(session_id), SESSION_TTL, json.dumps(data))
    except Exception:
        pass  # Gracefully degrade to in-memory store


def clear_session(session_id: str) -> None:
    """Delete a session."""
    _IN_MEM_SESSIONS.pop(session_id, None)
    try:
        r = get_redis()
        if r is not None:
            r.delete(_key(session_id))
    except Exception:
        pass


def get_session_meta(session_id: str) -> Dict[str, Any]:
    """Get session metadata (created_at, updated_at, message count)."""
    try:
        r = get_redis()
        if r is None:
            return {"exists": False}
        raw = r.get(_key(session_id))
        if not raw:
            return {"exists": False}
        data = json.loads(raw)
        return {
            "exists": True,
            "session_id": session_id,
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "message_count": len(data.get("messages", [])),
        }
    except Exception:
        return {"exists": False}


def build_history_prompt(session_id: str, last_n: int = 4) -> str:
    """
    Build a compact string of recent conversation turns for LLM context.
    Shows last_n turns only to keep tokens low.
    """
    hist = get_history(session_id)
    start_idx = max(0, len(hist) - last_n)
    history = hist[start_idx:]  # type: ignore
    if not history:
        return ""
    lines = []
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        content = str(msg["content"])[:300]  # type: ignore
        lines.append(f"{role}: {content}")
    return "\n".join(lines)
