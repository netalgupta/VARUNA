"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  Database,
  Search,
  Fish,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Bot,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

interface MultiAgentExecutionPanelProps {
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

export function MultiAgentExecutionPanel({
  isCollapsible = false,
  defaultExpanded = true,
}: MultiAgentExecutionPanelProps) {
  const { agentTrace, setActiveNav } = useOperationalState();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const planId = agentTrace?.plan_id || "plan_9f82b1c4";
  const latencySec = agentTrace?.total_latency_ms
    ? (agentTrace.total_latency_ms / 1000).toFixed(2)
    : "1.42";

  // ── Collapsed Slim Status Bar ──────────────────────────────────────────────
  if (isCollapsible && !isExpanded) {
    return (
      <div className="px-3.5 py-2.5 rounded-lg bg-[#121215] border border-white/[0.08] flex items-center justify-between gap-4 text-xs select-none transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded bg-zinc-800 border border-white/[0.06] flex items-center justify-center text-zinc-400 shrink-0">
            <BrainCircuit size={13} />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-medium text-zinc-200">
              Multi-Agent DAG
            </span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[10px] font-medium">
              Idle
            </span>
            <span className="text-zinc-500 hidden md:inline truncate">
              Ask a natural language query in Assistant to trigger live multi-agent execution
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-zinc-500 text-[11px]">
            <Zap size={11} className="text-zinc-400" />
            <span>Ready ({latencySec}s)</span>
          </div>
          <button
            onClick={() => setActiveNav("COPILOT")}
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Bot size={13} />
            <span>Open Assistant</span>
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1 border border-white/[0.06] cursor-pointer"
          >
            <span>Expand Pipeline</span>
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded Full DAG Visualizer ───────────────────────────────────────────
  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-lg flex flex-col h-full overflow-hidden p-3.5 relative select-none justify-between text-xs">
      {/* ── 1. Header with Plan ID & Total Latency ────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-zinc-800 border border-white/[0.06] flex items-center justify-center text-blue-400">
            <BrainCircuit size={13} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 text-xs">
              Multi-Agent Execution Pipeline
            </span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[10px] font-medium">
              DAG Visualizer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            Plan: <b className="font-mono text-zinc-200 font-normal">{planId}</b>
          </span>
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-zinc-500" />
            Total: <b className="text-zinc-200 font-mono font-normal">{latencySec}s</b>
          </span>
          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
              title="Collapse"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Wide Responsive Agent DAG Graph ────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center py-3 px-1 relative w-full my-auto">
        {/* Stage 1: Planner Agent (Wide Card) */}
        <div className="w-full max-w-sm z-10">
          <div
            onClick={() => setSelectedTask(selectedTask === "planner" ? null : "planner")}
            className="px-3.5 py-2 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 flex items-center justify-between cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-blue-400">
                <BrainCircuit size={13} />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  Planner Agent
                </div>
                <div className="text-[11px] text-zinc-500">Nemotron-550B Core</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                280ms
              </span>
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG (Wide branching) */}
        <div className="w-full max-w-lg h-5 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 20" preserveAspectRatio="none" fill="none">
            <path d="M250 0 L250 10 L80 10 L80 20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M250 0 L250 20" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M250 0 L250 10 L420 10 L420 20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Stage 2: 3 Parallel Agents Layer ─── */}
        <div className="w-full grid grid-cols-3 gap-2.5 z-10 max-w-lg">
          {/* SQL Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "sql" ? null : "sql")}
            className="p-2.5 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Database size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  SQL Agent
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">420ms</span>
            </div>
            <div className="text-[11px] text-zinc-500">PostGIS Spatial Query</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.04]">
              <span>Status: OK</span>
              <CheckCircle2 size={11} className="text-emerald-500" />
            </div>
          </div>

          {/* Biodiversity Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "bio" ? null : "bio")}
            className="p-2.5 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Fish size={13} className="text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Biodiversity
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">180ms</span>
            </div>
            <div className="text-[11px] text-zinc-500">CMLRE Living Species</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.04]">
              <span>Darwin Core</span>
              <CheckCircle2 size={11} className="text-emerald-500" />
            </div>
          </div>

          {/* Retrieval Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "rag" ? null : "rag")}
            className="p-2.5 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Search size={13} className="text-cyan-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Retrieval
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">210ms</span>
            </div>
            <div className="text-[11px] text-zinc-500">Hybrid Vector RAG</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.04]">
              <span>Top-K: 8</span>
              <CheckCircle2 size={11} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG to Synthesizer */}
        <div className="w-full max-w-lg h-5 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 20" preserveAspectRatio="none" fill="none">
            <path d="M80 0 L80 10 L250 10 L250 20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M250 0 L250 20" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M420 0 L420 10 L250 10 L250 20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Stage 3: Synthesizer Agent (Wide Card) */}
        <div className="w-full max-w-sm z-10">
          <div
            onClick={() => setSelectedTask(selectedTask === "synth" ? null : "synth")}
            className="px-3.5 py-2 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 flex items-center justify-between cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-amber-400">
                <Sparkles size={13} />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  Synthesizer Agent
                </div>
                <div className="text-[11px] text-zinc-500">Grounded Cognitive Synthesis</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                540ms
              </span>
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Section: Live Reasoning Trace & Performance ─────────── */}
      <div className="pt-2.5 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0 text-xs">
        {/* Live Reasoning Trace Checklist */}
        <div className="md:col-span-8 space-y-1">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Reasoning Trace</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="truncate">Regions: <b className="font-normal text-zinc-200">Arabian Sea, Equator</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="truncate">Variables: <b className="font-normal text-zinc-200">SST, DOXY, Salinity</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="truncate">Species: <b className="font-normal text-zinc-200 italic">Sardinella longiceps</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="truncate">Window: <b className="font-normal text-zinc-200">Last 6 months</b></span>
            </div>
          </div>
        </div>

        {/* Tokens & Performance Gauge */}
        <div className="md:col-span-4 flex items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/[0.06] pt-2 md:pt-0 pl-0 md:pl-3">
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="97, 100"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-medium text-zinc-200">97%</span>
          </div>

          <div className="text-right md:text-left ml-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              Performance
            </div>
            <div className="text-xs text-zinc-300 mt-0.5">
              Tokens: <b className="text-zinc-100 font-mono font-normal">2.1K</b>
            </div>
            <div className="text-[11px] text-zinc-500">
              Latency: <b className="text-zinc-300 font-mono font-normal">1.42s</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
