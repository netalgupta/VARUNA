"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Database,
  Search,
  Fish,
  AlertTriangle,
  GitCompare,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  LucideIcon,
  XCircle,
} from "lucide-react";

export interface AgentTaskStep {
  task_id: string;
  agent_type:
    | "PLANNER"
    | "SQL_GEN"
    | "RETRIEVAL"
    | "BIODIVERSITY"
    | "ANOMALY"
    | "COMPARISON"
    | "SYNTHESIZER"
    | string;
  description: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  duration_ms?: number;
  result_summary?: string;
  dependencies?: string[];
}

export interface AgentGraphProps {
  planId?: string;
  steps: AgentTaskStep[];
  isExecuting?: boolean;
  plannerModel?: string;
  totalLatencyMs?: number;
  topologicalOrder?: string[];
}

// Icon and color mappings for each specialized agent in the VARUNA ecosystem
const AGENT_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  PLANNER: {
    label: "Planner Agent",
    icon: BrainCircuit,
    color: "#2EE6C6",
    bg: "rgba(46, 230, 198, 0.12)",
    border: "rgba(46, 230, 198, 0.35)",
  },
  SQL_GEN: {
    label: "SQL-Gen Agent",
    icon: Database,
    color: "#00FFC6",
    bg: "rgba(0, 255, 198, 0.12)",
    border: "rgba(0, 255, 198, 0.35)",
  },
  SQL_GEN_AGENT: {
    label: "SQL-Gen Agent",
    icon: Database,
    color: "#00FFC6",
    bg: "rgba(0, 255, 198, 0.12)",
    border: "rgba(0, 255, 198, 0.35)",
  },
  RETRIEVAL: {
    label: "Hybrid Retrieval",
    icon: Search,
    color: "#1ECBE1",
    bg: "rgba(30, 203, 225, 0.12)",
    border: "rgba(30, 203, 225, 0.35)",
  },
  RETRIEVAL_AGENT: {
    label: "Hybrid Retrieval",
    icon: Search,
    color: "#1ECBE1",
    bg: "rgba(30, 203, 225, 0.12)",
    border: "rgba(30, 203, 225, 0.35)",
  },
  BIODIVERSITY: {
    label: "CMLRE Biodiversity",
    icon: Fish,
    color: "#2EE6C6",
    bg: "rgba(46, 230, 198, 0.12)",
    border: "rgba(46, 230, 198, 0.35)",
  },
  BIODIVERSITY_AGENT: {
    label: "CMLRE Biodiversity",
    icon: Fish,
    color: "#2EE6C6",
    bg: "rgba(46, 230, 198, 0.12)",
    border: "rgba(46, 230, 198, 0.35)",
  },
  ANOMALY: {
    label: "Anomaly Scanner",
    icon: AlertTriangle,
    color: "#FF7F50",
    bg: "rgba(255, 127, 80, 0.12)",
    border: "rgba(255, 127, 80, 0.35)",
  },
  ANOMALY_AGENT: {
    label: "Anomaly Scanner",
    icon: AlertTriangle,
    color: "#FF7F50",
    bg: "rgba(255, 127, 80, 0.12)",
    border: "rgba(255, 127, 80, 0.35)",
  },
  COMPARISON: {
    label: "Basin Comparator",
    icon: GitCompare,
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
  },
  SYNTHESIZER: {
    label: "Synthesizer Agent",
    icon: Sparkles,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
  },
  SYNTHESIZER_AGENT: {
    label: "Synthesizer Agent",
    icon: Sparkles,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
  },
};

const DEFAULT_CONFIG = {
  label: "Sub-Agent Task",
  icon: Activity,
  color: "#2EE6C6",
  bg: "rgba(46, 230, 198, 0.1)",
  border: "rgba(46, 230, 198, 0.25)",
};

export function AgentGraph({
  planId = "plan_dag_auto",
  steps = [],
  isExecuting = false,
  plannerModel = "nvidia/nemotron-ultra-550b",
  totalLatencyMs,
}: AgentGraphProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  // Calculate cumulative latency if not explicitly passed
  const computedLatency =
    totalLatencyMs ??
    steps.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);

  // Group steps into 3 topological layers:
  // 1. Planner Stage
  // 2. Parallel Execution Stage (SQL, Bio, Retrieval, Anomaly, Comparison)
  // 3. Synthesizer / Verifier Stage
  const plannerSteps = steps.filter((s) =>
    s.agent_type.toUpperCase().includes("PLANNER")
  );
  const synthSteps = steps.filter((s) =>
    s.agent_type.toUpperCase().includes("SYNTH")
  );
  const parallelSteps = steps.filter(
    (s) =>
      !s.agent_type.toUpperCase().includes("PLANNER") &&
      !s.agent_type.toUpperCase().includes("SYNTH")
  );

  // If no explicit planner or synth, fallback to linear list
  const isStructuredDAG = plannerSteps.length > 0 || synthSteps.length > 0;

  const renderTaskNode = (step: AgentTaskStep, index: number) => {
    const config = AGENT_CONFIG[step.agent_type] || DEFAULT_CONFIG;
    const Icon = config.icon;
    const isSelected = selectedTask === step.task_id;

    const isRunning = step.status === "RUNNING";
    const isCompleted = step.status === "COMPLETED";
    const isFailed = step.status === "FAILED";

    return (
      <motion.div
        key={step.task_id}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="w-full"
      >
        <div
          onClick={() =>
            setSelectedTask(isSelected ? null : step.task_id)
          }
          className={`
            relative group rounded-xl p-2.5 transition-all duration-200 cursor-pointer border
            ${
              isSelected
                ? "bg-bg-1 border-accent shadow-[0_0_20px_rgba(46,230,198,0.25)]"
                : isRunning
                ? "bg-bg-1/90 border-accent-secondary shadow-[0_0_15px_rgba(30,203,225,0.2)] animate-pulse"
                : isCompleted
                ? "bg-bg-2/70 hover:bg-bg-1 border-white/10 hover:border-accent/40"
                : isFailed
                ? "bg-red-950/20 border-red-500/40"
                : "bg-bg-2/40 border-white/5 opacity-70"
            }
          `}
        >
          {/* Top Row: Icon + Agent Name + Duration + Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: config.bg,
                  borderColor: config.border,
                }}
              >
                <Icon size={12} style={{ color: config.color }} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono font-semibold text-text truncate block">
                  {config.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {step.duration_ms !== undefined && (
                <span className="text-[10px] font-mono text-text-muted bg-white/5 px-1.5 py-0.5 rounded border border-white/5 flex items-center gap-1">
                  <Clock size={9} className="text-accent" />
                  {Math.round(step.duration_ms)}ms
                </span>
              )}

              {isRunning && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-accent-secondary bg-accent-secondary/10 px-1.5 py-0.5 rounded border border-accent-secondary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-ping" />
                  RUNNING
                </span>
              )}

              {isCompleted && (
                <span className="text-glow flex items-center" title="Step completed">
                  <CheckCircle2 size={13} className="text-glow" />
                </span>
              )}

              {isFailed && (
                <span className="text-coral-dim flex items-center" title="Step failed">
                  <XCircle size={13} className="text-coral-dim" />
                </span>
              )}

              {step.status === "PENDING" && (
                <span className="text-[9px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                  QUEUED
                </span>
              )}
            </div>
          </div>

          {/* Description Snippet */}
          <p className="text-[11px] font-sans text-text-muted mt-1.5 line-clamp-1 group-hover:text-text-2 transition-colors">
            {step.description}
          </p>

          {/* Expandable Details Drawer */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2 overflow-hidden"
              >
                <div>
                  <span className="text-[9px] font-mono text-accent uppercase tracking-wider block mb-0.5">
                    Task Objective
                  </span>
                  <p className="text-[11px] font-mono text-zinc-300 bg-black/30 p-2 rounded-lg border border-white/5">
                    {step.description}
                  </p>
                </div>

                {step.result_summary && (
                  <div>
                    <span className="text-[9px] font-mono text-glow uppercase tracking-wider block mb-0.5">
                      Execution Provenance Summary
                    </span>
                    <p className="text-[11px] font-mono text-text bg-glow/5 p-2 rounded-lg border border-glow/20 leading-relaxed">
                      {step.result_summary}
                    </p>
                  </div>
                )}

                {step.dependencies && step.dependencies.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">
                      Depends On:
                    </span>
                    {step.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="text-[9px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full mb-3 rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all">
      {/* ── Minimal DAG Disclosure Header ────────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-1.5 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-zinc-400" />
          <span className="text-[10px] font-mono text-zinc-400">
            Multi-Agent Mesh: <b className="text-zinc-300 font-semibold">{steps.length} Sub-Agents</b>
          </span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-[#00FFC6] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]" />
              <span>Executing...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {computedLatency > 0 && !isExecuting && (
            <span className="text-[9px] font-mono text-zinc-400">
              {Math.round(computedLatency)}ms
            </span>
          )}
          <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 hover:text-white">
            {isExpanded ? "Collapse" : "Inspect Process"}
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        </div>
      </div>

      {/* ── DAG Execution Stages ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 space-y-2.5 overflow-hidden"
          >
            {isStructuredDAG ? (
              <div className="space-y-2 relative">
                {/* 1. PLANNER STAGE */}
                {plannerSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-muted uppercase tracking-wider pl-1">
                      <BrainCircuit size={10} className="text-accent" />
                      <span>Stage 1 · Query Decomposition & DAG Planning</span>
                    </div>
                    {plannerSteps.map((step, idx) => renderTaskNode(step, idx))}
                  </div>
                )}

                {/* Flow Connector Arrow */}
                {plannerSteps.length > 0 && parallelSteps.length > 0 && (
                  <div className="flex justify-center py-0.5">
                    <div className="flex items-center gap-1 text-accent/60 font-mono text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                      <span className="w-8 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                      <ArrowRight size={10} className="text-accent" />
                    </div>
                  </div>
                )}

                {/* 2. PARALLEL SUB-AGENT EXECUTION STAGE */}
                {parallelSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono text-text-muted uppercase tracking-wider pl-1">
                      <div className="flex items-center gap-1.5">
                        <Layers size={10} className="text-accent-secondary" />
                        <span>
                          Stage 2 · Parallel Sub-Agent Execution (
                          {parallelSteps.length} tasks)
                        </span>
                      </div>
                      <span className="text-accent font-mono text-[9px]">
                        asyncio.gather
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {parallelSteps.map((step, idx) =>
                        renderTaskNode(step, plannerSteps.length + idx)
                      )}
                    </div>
                  </div>
                )}

                {/* Flow Connector Arrow */}
                {synthSteps.length > 0 && (
                  <div className="flex justify-center py-0.5">
                    <div className="flex items-center gap-1 text-glow/60 font-mono text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-glow/40" />
                      <span className="w-8 h-px bg-gradient-to-r from-transparent via-glow/40 to-transparent" />
                      <ArrowRight size={10} className="text-glow" />
                    </div>
                  </div>
                )}

                {/* 3. SYNTHESIS & PROVENANCE STAGE */}
                {synthSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-muted uppercase tracking-wider pl-1">
                      <Sparkles size={10} className="text-glow" />
                      <span>
                        Stage 3 · Grounded Synthesis & Zero-Hallucination
                        Verification
                      </span>
                    </div>
                    {synthSteps.map((step, idx) =>
                      renderTaskNode(
                        step,
                        plannerSteps.length + parallelSteps.length + idx
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Linear Fallback
              <div className="space-y-2">
                {steps.map((step, idx) => renderTaskNode(step, idx))}
              </div>
            )}

            {/* Footer telemetry */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>Verified Numerical Grounding · PostGIS & Darwin Core</span>
              <span>{steps.filter((s) => s.status === "COMPLETED").length}/{steps.length} Steps Complete</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentGraph;
