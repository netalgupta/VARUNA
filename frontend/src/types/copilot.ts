/**
 * Multi-Agent Orchestration & AI Copilot Types
 * Directly maps to backend models in `src.api.routes` and `src.api.ws`
 */

export interface TaskExecutionStep {
  task_id: string;
  agent_type: "SQL_GEN_AGENT" | "BIODIVERSITY_AGENT" | "RETRIEVAL_AGENT" | "SYNTHESIZER_AGENT" | string;
  description: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  duration_ms?: number;
  result_summary?: string;
  dependencies?: string[];
}

export interface AgentExecutionTrace {
  plan_id: string;
  total_latency_ms: number;
  planner_model: string;
  tasks: TaskExecutionStep[];
  topological_order?: string[];
}

export interface ChatIn {
  question?: string;
  query?: string;
  session_id?: string;
  session?: string;
  user_lat?: number;
  user_lon?: number;
}

export interface ChatOut {
  ok: boolean;
  answer_markdown?: string | null;
  sql?: string | null;
  rows?: Record<string, any>[] | null;
  agent_trace?: AgentExecutionTrace | null;
  viz_specs?: Record<string, any> | null;
  float_ids?: string[] | null;
  intent?: string | null;
  trace_id?: string | null;
  error?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  trace_id?: string;
  isStreaming?: boolean;
  metadata?: {
    intent?: string;
    sql?: string;
    rows?: Record<string, any>[];
    viz_specs?: Record<string, any>;
    float_ids?: string[];
  };
  agent_trace?: AgentExecutionTrace;
}

export interface FeedbackIn {
  session: string;
  query: string;
  sql_generated?: string | null;
  answer?: string | null;
  rating: number; // 1-5
  correction?: string | null;
  trace_id?: string | null;
}
