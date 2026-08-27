"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Bot,
  Sparkles,
  Layers,
  Database,
  Radio,
  BarChart3,
  Globe2,
  X,
} from "lucide-react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { MultiAgentExecutionPanel } from "@/features/agent-graph/MultiAgentExecutionPanel";
import { useOperationalState } from "@/providers/OperationalProvider";

// Dynamically import VarunaMap to avoid SSR issues
const VarunaMap = dynamic(
  () => import("@/features/ocean-map/VarunaMap").then((m) => ({ default: m.VarunaMap })),
  { ssr: false }
);

export function ChatbotView() {
  const { setSelectedFloatId, selectedFloatId, floats, biodiversity, anomalies } = useOperationalState();
  const [activeTab, setActiveTab] = useState<"chat" | "trace">("chat");
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden p-2 gap-2 select-none font-sans">
      {/* ── Top Chatbot Context Header ───────────────────────────────────── */}
      <div className="px-3 py-1.5 rounded-lg bg-[#0B1D2C]/90 border border-white/10 flex items-center justify-between shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Bot size={16} className="text-[#00FFC6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider">
                VARUNA AI OCEAN CHATBOT
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] bg-[#00FFC6]/15 text-[#00FFC6] font-bold border border-[#00FFC6]/30">
                MULTI-AGENT MESH
              </span>
            </div>
            <p className="text-[10px] text-[#809AAB]">
              Autonomous PostGIS SQL Generation · CMLRE Biodiversity Fusion · BGC Depth Profiles
            </p>
          </div>
        </div>

        {/* Right Info Badges */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0E2435] border border-white/5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
            <span>{floats.length} ARGO Floats</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0E2435] border border-white/5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>{biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"} Bio Taxa</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0E2435] p-0.5 rounded border border-white/5">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                activeTab === "chat"
                  ? "bg-[#2EE6C6] text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Chat &amp; Charts
            </button>
            <button
              onClick={() => setActiveTab("trace")}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                activeTab === "trace"
                  ? "bg-[#2EE6C6] text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Agent DAG Trace
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Asymmetric Split Screen (Map on Left, Chatbot on Right) ── */}
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden">
        {/* Left: Tactical MapLibre 2D Map (7 Cols on Desktop) */}
        <div className="col-span-12 lg:col-span-7 panel-marine relative overflow-hidden flex flex-col h-full rounded-xl border border-white/10 shadow-2xl bg-[#06121E]">
          <VarunaMap onHoverCoords={setHoverCoords} />

          {/* Bottom Floating Map Summary */}
          {selectedFloatId && (
            <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-2 bg-[#0B1D2C]/90 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md text-[10px] text-zinc-300 shadow-lg animate-in fade-in duration-150">
              <Radio size={11} className="text-[#00FFC6]" />
              <span>Active Target: <b className="text-white">#{selectedFloatId}</b></span>
              <button
                onClick={() => setSelectedFloatId("")}
                className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
                title="Unpick float"
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Conversational AI Chatbot & Agent DAG (5 Cols on Desktop) */}
        <div className="col-span-12 lg:col-span-5 h-full overflow-hidden flex flex-col rounded-xl border border-white/10 bg-[#0B1D2C]/95 shadow-2xl">
          {activeTab === "chat" ? (
            <ChatPanel onSelectFloat={(wmo) => setSelectedFloatId(wmo)} />
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar p-2">
              <MultiAgentExecutionPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
