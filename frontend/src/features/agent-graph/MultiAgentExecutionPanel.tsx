"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  Database,
  Search,
  Fish,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function MultiAgentExecutionPanel() {
  const { agentTrace } = useOperationalState();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const planId = agentTrace?.plan_id || "plan_9f82b1c4";
  const latencySec = agentTrace?.total_latency_ms
    ? (agentTrace.total_latency_ms / 1000).toFixed(2)
    : "1.42";

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-4 bg-[#0B1D2C]/90 relative select-none justify-between">
      {/* ── 1. Header with Plan ID & Total Latency ────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#2EE6C6]/15 pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center shadow-[0_0_10px_rgba(46,230,198,0.25)]">
            <BrainCircuit size={14} className="text-[#00FFC6]" />
          </div>
          <div>
            <div className="text-xs font-mono font-black tracking-wider text-white uppercase flex items-center gap-2">
              <span>Multi-Agent Execution</span>
              <span className="px-1.5 py-0.2 rounded bg-[#00FFC6]/15 text-[#00FFC6] text-[9px] border border-[#00FFC6]/30">
                ACTIVE DAG
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-[#809AAB]">
          <span>
            Plan ID: <b className="text-white font-mono">{planId}</b>
          </span>
          <span className="flex items-center gap-1">
            <Zap size={11} className="text-[#00FFC6]" />
            Total: <b className="text-[#00FFC6] font-mono">{latencySec}s</b>
          </span>
        </div>
      </div>

      {/* ── 2. Wide Responsive Agent DAG Graph ────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center py-2 px-1 relative w-full my-auto">
        {/* Stage 1: Planner Agent (Wide Card) */}
        <div className="w-full max-w-sm z-10">
          <div
            onClick={() => setSelectedTask(selectedTask === "planner" ? null : "planner")}
            className="px-3.5 py-2 rounded-xl bg-[#0E2435] border border-[#2EE6C6]/40 shadow-[0_0_15px_rgba(46,230,198,0.15)] flex items-center justify-between cursor-pointer hover:border-[#00FFC6] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#2EE6C6]/20 flex items-center justify-center shrink-0">
                <BrainCircuit size={13} className="text-[#00FFC6]" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white group-hover:text-[#00FFC6] transition-colors">
                  Planner Agent
                </div>
                <div className="text-[10px] font-mono text-[#809AAB]">Nemotron-550B Reasoning Core</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#00FFC6] bg-[#00FFC6]/10 px-1.5 py-0.5 rounded border border-[#00FFC6]/30">
                280ms
              </span>
              <CheckCircle2 size={13} className="text-[#00FFC6]" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG (Wide branching) */}
        <div className="w-full max-w-lg h-6 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 24" preserveAspectRatio="none" fill="none">
            <path d="M250 0 L250 12 L80 12 L80 24" stroke="rgba(46,230,198,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M250 0 L250 24" stroke="#00FFC6" strokeWidth="1.8" />
            <path d="M250 0 L250 12 L420 12 L420 24" stroke="rgba(46,230,198,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="250" cy="12" r="3" fill="#00FFC6" className="animate-ping" />
          </svg>
        </div>

        {/* Stage 2: 3 Parallel Agents Layer (Wide Grid Spanning Full Width) ─── */}
        <div className="w-full grid grid-cols-3 gap-2.5 z-10 max-w-lg">
          {/* SQL Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "sql" ? null : "sql")}
            className="p-2.5 rounded-xl bg-[#0E2435] border border-white/10 hover:border-[#2EE6C6]/50 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Database size={12} className="text-[#2EE6C6]" />
                <span className="text-[11px] font-mono font-bold text-white group-hover:text-[#2EE6C6] transition-colors">
                  SQL Agent
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#00FFC6] font-semibold">420ms</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400">PostGIS Spatial Query</div>
            <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-[#809AAB] pt-1 border-t border-white/5">
              <span>Status: OK</span>
              <CheckCircle2 size={10} className="text-[#00FFC6]" />
            </div>
          </div>

          {/* Biodiversity Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "bio" ? null : "bio")}
            className="p-2.5 rounded-xl bg-[#0E2435] border border-[#2EE6C6]/30 shadow-[0_0_12px_rgba(46,230,198,0.12)] hover:border-[#00FFC6] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Fish size={12} className="text-[#00FFC6]" />
                <span className="text-[11px] font-mono font-bold text-white group-hover:text-[#00FFC6] transition-colors">
                  Biodiversity
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#00FFC6] font-semibold">180ms</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400">CMLRE Living Core</div>
            <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-[#809AAB] pt-1 border-t border-white/5">
              <span>Darwin Core</span>
              <CheckCircle2 size={10} className="text-[#00FFC6]" />
            </div>
          </div>

          {/* Retrieval Agent */}
          <div
            onClick={() => setSelectedTask(selectedTask === "rag" ? null : "rag")}
            className="p-2.5 rounded-xl bg-[#0E2435] border border-white/10 hover:border-[#2EE6C6]/50 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Search size={12} className="text-[#1ECBE1]" />
                <span className="text-[11px] font-mono font-bold text-white group-hover:text-[#1ECBE1] transition-colors">
                  Retrieval
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#00FFC6] font-semibold">210ms</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400">Hybrid Vector RAG</div>
            <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-[#809AAB] pt-1 border-t border-white/5">
              <span>Top-K: 8</span>
              <CheckCircle2 size={10} className="text-[#00FFC6]" />
            </div>
          </div>
        </div>

        {/* Connecting Lines SVG to Synthesizer */}
        <div className="w-full max-w-lg h-6 relative my-0.5">
          <svg className="w-full h-full" viewBox="0 0 500 24" preserveAspectRatio="none" fill="none">
            <path d="M80 0 L80 12 L250 12 L250 24" stroke="rgba(46,230,198,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M250 0 L250 24" stroke="#00FFC6" strokeWidth="1.8" />
            <path d="M420 0 L420 12 L250 12 L250 24" stroke="rgba(46,230,198,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Stage 3: Synthesizer Agent (Wide Card) */}
        <div className="w-full max-w-sm z-10">
          <div
            onClick={() => setSelectedTask(selectedTask === "synth" ? null : "synth")}
            className="px-3.5 py-2 rounded-xl bg-[#0E2435] border border-[#00FFC6]/40 shadow-[0_0_15px_rgba(0,255,198,0.15)] flex items-center justify-between cursor-pointer hover:border-[#00FFC6] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#00FFC6]/20 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-[#00FFC6]" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white group-hover:text-[#00FFC6] transition-colors">
                  Synthesizer Agent
                </div>
                <div className="text-[10px] font-mono text-[#809AAB]">Grounded National Cognitive Synthesis</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#00FFC6] bg-[#00FFC6]/10 px-1.5 py-0.5 rounded border border-[#00FFC6]/30">
                540ms
              </span>
              <CheckCircle2 size={13} className="text-[#00FFC6]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Section: Live Reasoning Trace & Performance ─────────── */}
      <div className="pt-2.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
        {/* Live Reasoning Trace Checklist */}
        <div className="md:col-span-8 space-y-1">
          <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6] animate-ping" />
            <span>Live Reasoning Trace</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-300">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={11} className="text-[#00FFC6] shrink-0" />
              <span className="truncate">Regions: <b className="font-normal text-white">Arabian Sea, Equator</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={11} className="text-[#00FFC6] shrink-0" />
              <span className="truncate">Variables: <b className="font-normal text-white">SST, DOXY, Salinity</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={11} className="text-[#00FFC6] shrink-0" />
              <span className="truncate">Species: <b className="font-normal text-[#2EE6C6] italic">Sardinella longiceps</b></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 size={11} className="text-[#00FFC6] shrink-0" />
              <span className="truncate">Window: <b className="font-normal text-white">Last 6 months</b></span>
            </div>
          </div>
        </div>

        {/* Tokens & Performance Gauge */}
        <div className="md:col-span-4 flex items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 pl-0 md:pl-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            {/* Circular Gauge */}
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
                stroke="#00FFC6"
                strokeWidth="3"
                strokeDasharray="97, 100"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-bold text-white">97%</span>
          </div>

          <div className="text-right md:text-left ml-3">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
              Performance
            </div>
            <div className="text-[10px] font-mono text-white mt-0.5">
              Tokens: <b className="text-[#00FFC6]">2.1K</b>
            </div>
            <div className="text-[9px] font-mono text-[#809AAB]">
              Latency: <b className="text-[#00FFC6]">1.42s</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
