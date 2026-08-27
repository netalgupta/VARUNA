"use client";

import { OperationalProvider } from "@/providers/OperationalProvider";
import { ChatbotView } from "@/features/chatbot/ChatbotView";

export default function CopilotRoute() {
  return (
    <OperationalProvider>
      <ChatbotView />
    </OperationalProvider>
  );
}
