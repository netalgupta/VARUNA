"""
VARUNA — WebSocket Streaming Server (v2)

Full real-time pipeline transparency via plan_and_execute + PipelineEventBus.

WebSocket Protocol (ws://host/ws/chat):
  CLIENT -> SERVER:
    {"question": "...", "session": "...", "user_lat": null, "user_lon": null}

  SERVER -> CLIENT (streamed in order):
    {"type": "pipeline_step", "data": {"stage": "PLANNER",  "status": "RUNNING", "message": "..."}}
    {"type": "pipeline_step", "data": {"stage": "PLANNER",  "status": "DONE",    "duration_ms": 340}}
    {"type": "pipeline_step", "data": {"stage": "SQL_GEN",  "status": "RUNNING", "task_id": "task_01_sql"}}
    {"type": "sql",           "data": "SELECT ..."}
    {"type": "rows",          "data": [{...}, ...]}
    {"type": "pipeline_step", "data": {"stage": "SQL_GEN",  "status": "DONE",    "duration_ms": 820, "row_count": 40}}
    {"type": "pipeline_step", "data": {"stage": "RETRIEVAL","status": "RUNNING"}}
    {"type": "pipeline_step", "data": {"stage": "RETRIEVAL","status": "DONE",    "duration_ms": 210}}
    {"type": "pipeline_step", "data": {"stage": "SYNTHESIZER","status": "RUNNING"}}
    {"type": "pipeline_step", "data": {"stage": "SYNTHESIZER","status": "DONE",  "duration_ms": 450}}
    {"type": "done",          "data": {"answer_markdown": "...", "trace_id": "...", "row_count": 40,
                                       "agent_trace": {...}, "viz_specs": {...}, "intent": "..."}}
    {"type": "error",         "data": "Error message"} (only on failure)
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.api.event_bus import PipelineEventBus
from src.memory.conversation import append_message, build_history_prompt

log = logging.getLogger("varuna.ws")
router = APIRouter()


async def _send(ws: WebSocket, msg_type: str, data) -> None:
    """Serialize and send a typed JSON frame over the WebSocket."""
    try:
        await ws.send_text(json.dumps({"type": msg_type, "data": data}, default=str))
    except Exception as e:
        log.debug("WS send failed (client likely disconnected): %s", e)


async def _drain_bus_to_ws(bus: PipelineEventBus, ws: WebSocket) -> None:
    """Drain ALL pending events from the bus to the WebSocket (non-blocking)."""
    while not bus.empty():
        evt = await bus.get_nowait()
        if evt:
            await ws.send_text(json.dumps(evt, default=str))


@router.websocket("/ws/chat")
@router.websocket("/api/v1/ws/chat")
@router.websocket("/api/ws/chat")
async def ws_chat(websocket: WebSocket):
    """
    WebSocket endpoint for full real-time pipeline streaming.
    Emits granular per-agent events as they happen inside plan_and_execute.
    """
    await websocket.accept()
    log.info("WebSocket connected: %s", websocket.client)

    try:
        while True:
            raw = await websocket.receive_text()
            inp = json.loads(raw)

            q: str = inp.get("question", inp.get("query", "")).strip()
            session: str = inp.get("session", inp.get("session_id", "default"))
            user_lat: Optional[float] = inp.get("user_lat")
            user_lon: Optional[float] = inp.get("user_lon")
            trace_id = str(uuid.uuid4())

            if not q:
                await _send(websocket, "error", "Empty question")
                continue

            # Fast-path: smalltalk (greetings, math, time)
            from src.api.routes import _smalltalk
            st = _smalltalk(q)
            if st:
                await _send(websocket, "pipeline_step", {
                    "stage": "INTENT", "status": "DONE",
                    "message": "Smalltalk / fast-path response"
                })
                await _send(websocket, "done", {
                    "answer_markdown": st,
                    "trace_id": trace_id,
                    "intent": "SMALLTALK",
                    "row_count": 0,
                })
                append_message(session, "user", q)
                append_message(session, "assistant", st)
                continue

            # Store user turn in memory
            append_message(session, "user", q)

            # ── Create the event bus for this connection ───────────────────────
            bus = PipelineEventBus()

            # ── Run plan_and_execute in a background task, draining events ─────
            from src.agents.orchestrator import plan_and_execute

            orchestrator_task = asyncio.create_task(
                plan_and_execute(
                    query=q,
                    session_id=session,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    event_bus=bus,
                )
            )

            # ── Drain bus events to client while orchestrator runs ─────────────
            final_result = None
            while not orchestrator_task.done():
                try:
                    # Wait up to 0.05s for an event; then poll again
                    evt = await asyncio.wait_for(bus.get(), timeout=0.05)
                    await websocket.send_text(json.dumps(evt, default=str))
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    log.warning("Bus drain error: %s", e)

                await _drain_bus_to_ws(bus, websocket)

            # Drain any remaining events after task finishes
            await _drain_bus_to_ws(bus, websocket)

            # ── Collect result ─────────────────────────────────────────────────
            try:
                final_result = orchestrator_task.result()
            except Exception as e:
                log.error("Orchestrator task failed: %s", e, exc_info=True)
                await _send(websocket, "error", str(e))
                continue

            # ── Send final "done" payload ──────────────────────────────────────
            if final_result:
                append_message(session, "assistant", final_result.answer_markdown or "")
                done_payload = {
                    "trace_id": trace_id,
                    "answer_markdown": final_result.answer_markdown,
                    "sql": final_result.sql,
                    "rows": final_result.rows,
                    "row_count": len(final_result.rows) if final_result.rows else 0,
                    "intent": final_result.intent,
                    "float_ids": final_result.float_ids,
                    "viz_specs": final_result.viz_specs,
                    "agent_trace": (
                        final_result.agent_trace.model_dump()
                        if hasattr(final_result.agent_trace, "model_dump")
                        else final_result.agent_trace
                    ),
                }
                await _send(websocket, "done", done_payload)
            else:
                await _send(websocket, "error", "No result returned from orchestrator")

    except WebSocketDisconnect:
        log.info("WebSocket disconnected: %s", websocket.client)
    except Exception as e:
        log.error("WebSocket fatal error: %s", e, exc_info=True)
        try:
            await _send(websocket, "error", str(e))
        except Exception:
            pass
