"""
VARUNA -- Async Pipeline Event Bus
"""
from __future__ import annotations
import asyncio
from typing import Any, Dict, Optional


class PipelineEventBus:
    """Lightweight async queue bridging orchestrator -> WebSocket sender."""

    def __init__(self) -> None:
        self._q: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()

    async def emit(self, event_type: str, data: Any, **meta: Any) -> None:
        """Push an event. Orchestrator calls this; never blocks."""
        await self._q.put({"type": event_type, "data": data, **meta})

    async def get(self) -> Dict[str, Any]:
        """Drain the next event. WebSocket loop calls this."""
        return await self._q.get()

    async def get_nowait(self) -> Optional[Dict[str, Any]]:
        try:
            return self._q.get_nowait()
        except asyncio.QueueEmpty:
            return None

    def empty(self) -> bool:
        return self._q.empty()
