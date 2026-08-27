"use client";

import { OperationalProvider } from "@/providers/OperationalProvider";
import { ChatbotView } from "@/features/chatbot/ChatbotView";

export default function ChatbotRoute() {
  return (
    <OperationalProvider>
      <ChatbotView />
    </OperationalProvider>
  );
}
