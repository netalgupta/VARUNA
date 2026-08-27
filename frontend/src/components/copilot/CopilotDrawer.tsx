"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  Send,
  BrainCircuit,
  Database,
  ShieldCheck,
  Code,
  Copy,
  Check,
  ChevronRight,
  Radio,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOperationalState } from "@/providers/OperationalProvider";
import { apiClient } from "@/lib/api/client";
import type { ChatOut, AgentExecutionTrace } from "@/types/copilot";

const SAMPLE_QUESTIONS = [
  "Compare dissolved oxygen in Arabian Sea vs Equator and show Sardinella longiceps impact.",
  "Detect marine heatwave anomalies in Bay of Bengal vs 30-year climatological baseline.",
  "Identify coral bleaching vulnerability in Gulf of Mannar for Acropora millepora.",
  "Show vertical salinity and temperature profile for ARGO float 1902303.",
];

export function CopilotDrawer() {
  const {
    copilotOpen,
    setCopilotOpen,
    setSelectedFloatId,
    setAgentTrace,
    flyToCoordinates,
  } = useOperationalState();

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; sql?: string; trace?: AgentExecutionTrace }>
  >([
    {
      role: "assistant",
      content:
        "### 🌊 Welcome to VARUNA Ocean Copilot\n\nI fuse **INCOIS ARGO physical oceanography** with **CMLRE marine biodiversity records** via Multi-Agent cognitive task planning. Ask me any cross-domain question!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!copilotOpen) return null;

  const handleSubmit = async (q = inputQuery) => {
    if (!q.trim() || isLoading) return;
    const userMsg = q.trim();
    setInputQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await apiClient<ChatOut>("/api/v1/agent/chat", {
        method: "POST",
        body: JSON.stringify({ question: userMsg, session_id: "varuna_session_main" }),
      });

      if (res.agent_trace) {
        setAgentTrace(res.agent_trace);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer_markdown || "Analysis complete.",
          sql: res.sql || undefined,
          trace: res.agent_trace || undefined,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Request failed: ${err.message || "Backend service offline"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0B1D2C]/95 border-l border-[#2EE6C6]/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-between">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#020B14]/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Sparkles size={14} className="text-[#00FFC6]" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              VARUNA Copilot
            </div>
            <div className="text-[9px] font-mono text-[#809AAB]">
              Marine Ecosystem Multi-Agent Core
            </div>
          </div>
        </div>

        <button
          onClick={() => setCopilotOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Chat Messages Stream ─────────────────────────────────────────── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs custom-scrollbar">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl ${
              m.role === "user"
                ? "bg-[#2EE6C6]/15 border border-[#2EE6C6]/30 text-white ml-6"
                : "bg-[#0E2435] border border-white/10 text-zinc-200 mr-2"
            }`}
          >
            {m.role === "user" ? (
              <p>{m.content}</p>
            ) : (
              <div className="prose prose-invert prose-xs max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>

                {/* Generated SQL Drawer */}
                {m.sql && (
                  <div className="mt-3 p-2 rounded bg-black/50 border border-white/10 text-[10px]">
                    <div className="flex items-center justify-between text-zinc-400 mb-1">
                      <span className="flex items-center gap-1 text-[#2EE6C6] font-bold">
                        <Code size={11} /> Generated PostGIS SQL
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.sql || "");
                          setCopiedSql(true);
                          setTimeout(() => setCopiedSql(false), 2000);
                        }}
                        className="flex items-center gap-1 text-zinc-400 hover:text-white"
                      >
                        {copiedSql ? <Check size={11} className="text-[#00FFC6]" /> : <Copy size={11} />}
                        <span>{copiedSql ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <code className="text-zinc-300 font-mono block overflow-x-auto whitespace-pre-wrap">
                      {m.sql}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="p-3 rounded-xl bg-[#0E2435] border border-[#2EE6C6]/30 text-zinc-300 flex items-center gap-2">
            <Sparkles size={14} className="text-[#00FFC6] animate-spin" />
            <span className="text-xs font-mono">Executing Multi-Agent Task DAG...</span>
          </div>
        )}
      </div>

      {/* ── Starter Queries & Input Box ──────────────────────────────────── */}
      <div className="p-3.5 border-t border-white/10 bg-[#020B14]/80 space-y-2">
        {/* Starter Query Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[9px] font-mono">
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSubmit(q)}
              className="px-2 py-1 rounded bg-[#0E2435] hover:bg-[#10293A] text-zinc-300 hover:text-white border border-white/10 hover:border-[#2EE6C6]/40 whitespace-nowrap transition-all"
            >
              {q.substring(0, 32)}...
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask VARUNA (e.g. Arabian Sea hypoxia vs sardines)..."
            className="flex-1 h-9 px-3 rounded-lg bg-[#0B1D2C] border border-[#2EE6C6]/25 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#2EE6C6]"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || !inputQuery.trim()}
            className="h-9 px-3 rounded-lg bg-[#2EE6C6] hover:bg-[#00FFC6] text-black font-bold flex items-center justify-center transition-all disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
