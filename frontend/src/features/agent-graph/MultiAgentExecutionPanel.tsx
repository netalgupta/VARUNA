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
      <div className="px-3.5 py-2.5 rounded-lg bg-gradient-to-b from-[#0d1b32]/85 to-[#081222]/90 border border-sky-500/20 backdrop-blur-md flex items-center justify-between gap-4 text-xs select-none transition-colors shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded bg-[#0e1c36] border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
            <BrainCircuit size={13} />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-white">
              Multi-Agent DAG
            </span>
            <span className="px-1.5 py-0.2 rounded bg-[#0e1c36] text-sky-300 border border-sky-500/20 text-[10px] font-medium">
              Idle
            </span>
            <span className="text-slate-400 hidden md:inline truncate">
              Ask a natural language query in Assistant to trigger live multi-agent execution
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
            <Zap size={11} className="text-sky-400" />
            <span>Ready ({latencySec}s)</span>
          </div>
          <button
            onClick={() => setActiveNav("COPILOT")}
            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Bot size={13} />
            <span>Open Assistant</span>
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-2.5 py-1 rounded bg-[#0e1c36] hover:bg-[#142646] text-sky-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1 border border-sky-500/25 cursor-pointer"
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
    <div className="bg-gradient-to-b from-[#0d1b32]/85 to-[#081222]/90 border border-sky-500/20 backdrop-blur-md rounded-lg flex flex-col h-full overflow-hidden p-3.5 relative select-none justify-between text-xs shadow-lg">
      {/* ── 1. Header with Plan ID & Total Latency ────────────────────────── */}
      <div className="flex items-center justify-between border-b border-sky-500/15 pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#0e1c36] border border-sky-500/25 flex items-center justify-center text-sky-400">
            <BrainCircuit size={13} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-xs">
              Multi-Agent Execution Pipeline
            </span>
            <span className="px-1.5 py-0.2 rounded bg-[#0e1c36] text-sky-300 border border-sky-500/20 text-[10px] font-medium">
              DAG Visualizer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            Plan: <b className="font-mono text-slate-200 font-normal">{planId}</b>
          </span>
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-sky-400" />
            Total: <b className="text-slate-200 font-mono font-normal">{latencySec}s</b>
          </span>
          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-[#0e1c36] text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
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
            className="px-3.5 py-2 rounded-md bg-[#0a1426]/90 border border-sky-500/25 hover:border-sky-400/60 flex items-center justify-between cursor-pointer transition-all group backdrop-blur-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-[#0e1c36] border border-sky-500/25 flex items-center justify-center shrink-0 text-sky-400">
                <BrainCircuit size={13} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                  Planner Agent
                </div>
                <div className="text-[11px] text-slate-400">Nemotron-550B Core</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-sky-300 bg-[#0e1c36] border border-sky-500/20 px-1.5 py-0.2 rounded">
                280ms
              </span>
              <CheckCircle2 size={13} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG (Wide branching) */}
        <div className="w-full max-w-lg h-5 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 20" preserveAspectRatio="none" fill="none">
            <path d="M250 0 L250 10 L80 10 L80 20" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M250 0 L250 20" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M250 0 L250 10 L420 10 L420 20" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Stage 2: 3 Parallel Agents Layer ─── */}
        <div className="w-full grid grid-cols-3 gap-2.5 z-10 max-w-lg">
          {/* SQL Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "sql" ? null : "sql")}
            className="p-2.5 rounded-md bg-[#0a1426]/90 border border-sky-500/20 hover:border-sky-400/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Database size={13} className="text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">
                  SQL Agent
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">420ms</span>
            </div>
            <div className="text-[11px] text-slate-400">PostGIS Spatial Query</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-sky-500/10">
              <span>Status: OK</span>
              <CheckCircle2 size={11} className="text-emerald-400" />
            </div>
          </div>

          {/* Biodiversity Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "bio" ? null : "bio")}
            className="p-2.5 rounded-md bg-[#0a1426]/90 border border-sky-500/20 hover:border-emerald-400/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Fish size={13} className="text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Biodiversity
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">180ms</span>
            </div>
            <div className="text-[11px] text-slate-400">CMLRE Living Species</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-sky-500/10">
              <span>Darwin Core</span>
              <CheckCircle2 size={11} className="text-emerald-400" />
            </div>
          </div>

          {/* Retrieval Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "rag" ? null : "rag")}
            className="p-2.5 rounded-md bg-[#0a1426]/90 border border-sky-500/20 hover:border-cyan-400/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Search size={13} className="text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Retrieval
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">210ms</span>
            </div>
            <div className="text-[11px] text-slate-400">Hybrid Vector RAG</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-sky-500/10">
              <span>Top-K: 8</span>
              <CheckCircle2 size={11} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG to Synthesizer */}
        <div className="w-full max-w-lg h-5 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 20" preserveAspectRatio="none" fill="none">
            <path d="M80 0 L80 10 L250 10 L250 20" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M250 0 L250 20" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M420 0 L420 10 L250 10 L250 20" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Stage 3: Synthesizer Agent (Wide Card) */}
        <div className="w-full max-w-sm z-10">
          <div
            onClick={() => setSelectedTask(selectedTask === "synth" ? null : "synth")}
            className="px-3.5 py-2 rounded-md bg-[#0a1426]/90 border border-sky-500/25 hover:border-amber-400/60 flex items-center justify-between cursor-pointer transition-all group backdrop-blur-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-[#0e1c36] border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-400">
                <Sparkles size={13} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Synthesizer Agent
                </div>
                <div className="text-[11px] text-slate-400">Grounded Cognitive Synthesis</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-amber-300 bg-[#0e1c36] border border-amber-500/20 px-1.5 py-0.2 rounded">
                540ms
              </span>
              <CheckCircle2 size={13} className="text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Section: Live Reasoning Trace & Performance ─────────── */}
      <div className="pt-2.5 border-t border-sky-500/15 grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0 text-xs">
        {/* Live Reasoning Trace Checklist */}
        <div className="md:col-span-8 space-y-1">
          <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
            <span>Reasoning Trace</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">Regions: <b className="font-normal text-white">Arabian Sea, Equator</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">Variables: <b className="font-normal text-white">SST, DOXY, Salinity</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">Species: <b className="font-normal text-sky-300 italic">Sardinella longiceps</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">Window: <b className="font-normal text-white">Last 6 months</b></span>
            </div>
          </div>
        </div>

        {/* Tokens & Performance Gauge */}
        <div className="md:col-span-4 flex items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-sky-500/15 pt-2 md:pt-0 pl-0 md:pl-3">
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(56, 189, 248, 0.15)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                strokeDasharray="97, 100"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-semibold text-white">97%</span>
          </div>

          <div className="text-right md:text-left ml-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Performance
            </div>
            <div className="text-xs text-slate-200 mt-0.5">
              Tokens: <b className="text-sky-300 font-mono font-semibold">2.1K</b>
            </div>
            <div className="text-[11px] text-slate-400">
              Latency: <b className="text-slate-200 font-mono font-medium">1.42s</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
