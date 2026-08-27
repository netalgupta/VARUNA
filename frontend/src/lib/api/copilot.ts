/**
 * Multi-Agent Orchestration & Observability API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { ChatIn, ChatOut, FeedbackIn } from "@/types/copilot";

export async function postAgentChat(payload: ChatIn): Promise<ChatOut> {
  return apiClient<ChatOut>(ENDPOINTS.AGENT_CHAT, {
    method: "POST",
    body: JSON.stringify(payload),
    timeout: 120000,
  });
}

export async function postChatFast(payload: ChatIn): Promise<ChatOut> {
  return apiClient<ChatOut>(ENDPOINTS.CHAT_FAST, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitFeedback(
  feedback: FeedbackIn
): Promise<{ status: string; feedback_id: string }> {
  return apiClient<{ status: string; feedback_id: string }>(
    ENDPOINTS.FEEDBACK,
    {
      method: "POST",
      body: JSON.stringify(feedback),
    }
  );
}

export async function getDebugTrace(traceId: string): Promise<any> {
  return apiClient<any>(ENDPOINTS.DEBUG_TRACE(traceId));
}
