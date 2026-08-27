"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  AgentExecutionTrace,
  TaskExecutionStep,
  ChatIn,
  ChatOut,
} from "@/types/copilot";
import { postAgentChat, postChatFast } from "@/lib/api/copilot";

export type { ChatMessage, AgentExecutionTrace, TaskExecutionStep };
export type ChatMode = "agent" | "quick";

export interface PipelineStepEvent {
  stage: "PLANNER" | "SQL_GEN" | "RETRIEVAL" | "BIODIVERSITY" | "SYNTHESIZER" | "INTENT" | string;
  status: "RUNNING" | "DONE" | "FAILED" | "COMPLETED";
  task_id?: string;
  message?: string;
  duration_ms?: number;
  row_count?: number;
  plan_id?: string;
  task_ids?: string[];
  params?: Record<string, any>;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>("agent");

  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || apiUrl.replace(/^http/, "ws") + "/ws/chat";

    try {
      const ws = new WebSocket(wsBase);

      ws.onopen = () => {
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, data } = msg;

          if (type === "pipeline_step") {
            const step: PipelineStepEvent = data;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;

              const existingTrace = last.agent_trace || {
                plan_id: step.plan_id || "plan_live",
                total_latency_ms: 0,
                planner_model: "nvidia/nemotron-3-super-120b-a12b:free",
                topological_order: [],
                tasks: [],
              };

              const taskId = step.task_id || `task_${step.stage.toLowerCase()}`;
              const taskIndex = existingTrace.tasks.findIndex((t) => t.task_id === taskId);
              const normalizedStatus =
                step.status === "DONE" ? "COMPLETED" : step.status === "RUNNING" ? "RUNNING" : "FAILED";

              let updatedTasks = [...existingTrace.tasks];
              if (taskIndex >= 0) {
                updatedTasks[taskIndex] = {
                  ...updatedTasks[taskIndex],
                  status: normalizedStatus as any,
                  duration_ms: step.duration_ms || updatedTasks[taskIndex].duration_ms,
                  result_summary: step.message || updatedTasks[taskIndex].result_summary,
                };
              } else {
                updatedTasks.push({
                  task_id: taskId,
                  agent_type: step.stage,
                  description: step.message || `${step.stage} Agent Execution`,
                  status: normalizedStatus as any,
                  duration_ms: step.duration_ms || 0,
                  result_summary: step.message || "Executing task",
                });
              }

              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  agent_trace: {
                    ...existingTrace,
                    plan_id: step.plan_id || existingTrace.plan_id,
                    topological_order: step.task_ids || existingTrace.topological_order,
                    tasks: updatedTasks,
                  },
                },
              ];
            });
          } else if (type === "token") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + data },
              ];
            });
          } else if (type === "sql") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, metadata: { ...last.metadata, sql: data } },
              ];
            });
          } else if (type === "rows") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, metadata: { ...last.metadata, rows: data } },
              ];
            });
          } else if (type === "viz") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, metadata: { ...last.metadata, viz_specs: data } },
              ];
            });
          } else if (type === "done") {
            setIsTyping(false);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;

              const existingMeta = last.metadata || {};
              const mergedRows = (data?.rows && Array.isArray(data.rows) && data.rows.length > 0)
                ? data.rows
                : existingMeta.rows;
              const mergedVizSpecs = (data?.viz_specs && Object.keys(data.viz_specs).length > 0)
                ? data.viz_specs
                : existingMeta.viz_specs;
              const mergedSql = data?.sql || existingMeta.sql;

              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: data?.answer_markdown || last.content || "Analysis complete.",
                  isStreaming: false,
                  trace_id: data?.trace_id || last.trace_id,
                  metadata: {
                    ...existingMeta,
                    sql: mergedSql,
                    rows: mergedRows,
                    viz_specs: mergedVizSpecs,
                    float_ids: data?.float_ids || existingMeta.float_ids,
                    intent: data?.intent || existingMeta.intent,
                  },
                  agent_trace: data?.agent_trace || last.agent_trace,
                },
              ];
            });
          } else if (type === "error") {
            setIsTyping(false);
            setError(typeof data === "string" ? data : "An error occurred during multi-agent orchestration.");
          }
        } catch (e) {
          console.error("Failed to parse WS message", e, event.data);
        }
      };

      ws.onerror = () => {
        wsRef.current = null;
      };

      ws.onclose = () => {
        wsRef.current = null;
        setTimeout(() => connect(), 3000);
      };

      wsRef.current = ws;
    } catch {
      setTimeout(() => connect(), 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    async (content: string, customMode?: ChatMode) => {
      const activeMode = customMode || mode;
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const assistantMsgId = `assistant-${Date.now() + 1}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsTyping(true);
      setError(null);

      // 1. Primary path: Real-time WebSocket Protocol as specified in VARUNA_Frontend_Integration_Guide.md
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            question: trimmed,
            session: "default",
            user_lat: null,
            user_lon: null,
          })
        );
        return;
      }

      // 2. Fallback path: REST API if WebSocket is connecting or unavailable
      try {
        const payload: ChatIn = {
          question: trimmed,
          session_id: "default",
          session: "default",
        };

        const data: ChatOut =
          activeMode === "agent"
            ? await postAgentChat(payload)
            : await postChatFast(payload);

        if (data.ok !== false) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content: data.answer_markdown || "Analysis complete.",
                isStreaming: false,
                trace_id: data.trace_id || undefined,
                metadata: {
                  intent: data.intent || undefined,
                  sql: data.sql || undefined,
                  rows: data.rows || undefined,
                  viz_specs: data.viz_specs || undefined,
                  float_ids: data.float_ids || undefined,
                },
                agent_trace: data.agent_trace || undefined,
              },
            ];
          });
        } else {
          setError(data.error || "Failed to process marine intelligence query.");
          setMessages((prev) => prev.slice(0, -1));
        }
      } catch (e: any) {
        setError(e.message || "Failed to establish link with VARUNA Intelligence Core.");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsTyping(false);
      }
    },
    [mode]
  );

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isTyping,
    error,
    mode,
    setMode,
    clearMessages: () => setMessages([]),
  };
}

export default useChatStream;
