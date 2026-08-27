"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  ArrowRight,
  RefreshCw,
  Terminal,
  Zap,
  Copy,
  Check,
  Play,
  Download,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Database,
  Sparkles,
  ShieldCheck,
  Trash2,
  Radio,
  BarChart2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStream, ChatMode } from "@/hooks/useChatStream";
import { AgentGraph } from "./AgentGraph";
import { ChartRouter } from "@/components/charts";
import { useOperationalState } from "@/providers/OperationalProvider";

interface ChatPanelProps {
  onRunInSqlConsole?: (sql: string) => void;
  onSelectFloat?: (floatId: string) => void;
}

const msgVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 28 },
  },
};

const STARTER_PROMPTS = [
  {
    category: "Cross-Domain Compound",
    label: "Arabian Sea Hypoxia ⇄ Sardine Migration",
    query:
      "Compare dissolved oxygen in the Arabian Sea over the last 6 months vs the Equator and analyze its impact on Sardinella longiceps habitat compression.",
  },
  {
    category: "Anomaly & Heatwave",
    label: "Bay of Bengal SST vs 30-Yr Baseline",
    query:
      "Detect marine heatwave anomalies in the Bay of Bengal and Gulf of Mannar comparing current SST with the 30-year climatological baseline.",
  },
  {
    category: "Biodiversity Fusion",
    label: "Coral Bleaching Vulnerability MPAs",
    query:
      "Identify coral reef regions in Lakshadweep and Gulf of Mannar where degree heating weeks exceed bleaching thresholds for Acropora millepora.",
  },
  {
    category: "Physical Oceanography",
    label: "ARGO 1902303 Vertical Salinity Profile",
    query:
      "Show me the vertical depth profile for temperature, salinity, and dissolved oxygen for float 1902303 in the Arabian Sea.",
  },
];

// Helper to render provenance citations [WMO: 1902303 | Row #4] as interactive badges
function ProvenanceMarkdown({
  content,
  onSelectFloat,
}: {
  content: string;
  onSelectFloat?: (wmo: string) => void;
}) {
  // Replace [WMO: 1902303 | Row #4] pattern with custom badge formatting
  const renderWithBadges = (text: string) => {
    const regex = /\[WMO:\s*(\d+)\s*\|\s*Row\s*#(\d+)\]/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }

      const wmo = match[1];
      const row = match[2];

      parts.push(
        <span
          key={`${wmo}-${row}-${match.index}`}
          onClick={() => onSelectFloat?.(wmo)}
          title={`Verified In-Situ Provenance · WMO Platform ${wmo}, Observation Row #${row}`}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-glow/10 border border-glow/30 text-glow cursor-pointer hover:bg-glow/20 transition-colors select-none shadow-[0_0_8px_rgba(0,255,198,0.15)] align-baseline"
        >
          <ShieldCheck size={10} className="text-glow shrink-0" />
          <span>
            WMO: <strong className="text-text">{wmo}</strong> | Row #{row}
          </span>
        </span>
      );

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts;
  };

  return (
    <div className="font-sans text-zinc-200 text-[13.5px] leading-relaxed select-text space-y-2 mt-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-[15px] font-semibold text-white mb-2">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14.5px] font-semibold text-white mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-semibold text-white mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13.5px] font-semibold text-white mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => {
            if (typeof children === "string") {
              return <p className="mb-2 text-[13.5px] leading-relaxed text-zinc-200">{renderWithBadges(children)}</p>;
            }
            return <p className="mb-2 text-[13.5px] leading-relaxed text-zinc-200">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="space-y-1 mb-2 pl-4 list-disc text-zinc-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 mb-2 text-[13.5px] text-zinc-200">{children}</ol>
          ),
          li: ({ children }) => {
            if (typeof children === "string") {
              return <li className="text-[13.5px] leading-relaxed text-zinc-200">{renderWithBadges(children)}</li>;
            }
            return <li className="text-[13.5px] leading-relaxed text-zinc-200">{children}</li>;
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[12px] text-[#2EE6C6] font-medium">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Expandable Interactive Visualization Drawer with Display / Hide Toggle
function ExpandableChartDrawer({
  vizSpecs,
  rows,
}: {
  vizSpecs?: any;
  rows?: any[];
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!vizSpecs && (!rows || rows.length === 0)) return null;

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 overflow-hidden shadow-lg transition-all">
      {/* Header Bar with Display / Hide Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none border-b border-white/5 bg-[#0B1D2C]/70"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={13} className="text-[#00FFC6]" />
          <span className="text-[10px] font-mono font-bold text-[#00FFC6] uppercase tracking-wider">
            Interactive Oceanographic Visualization
          </span>
          {rows && rows.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
              {rows.length} Points
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 hover:bg-[#00FFC6]/20 text-zinc-300 hover:text-[#00FFC6] transition-all border border-white/5"
        >
          {isOpen ? (
            <>
              <EyeOff size={11} className="text-[#FF6B6B]" />
              <span>Hide Graph</span>
            </>
          ) : (
            <>
              <Eye size={11} className="text-[#00FFC6]" />
              <span>Display Graph</span>
            </>
          )}
        </button>
      </div>

      {/* Collapsible Chart Body */}
      {isOpen && (
        <div className="p-2 w-full min-h-[330px] animate-in fade-in duration-200">
          <ChartRouter vizSpecs={vizSpecs} rows={rows} />
        </div>
      )}
    </div>
  );
}

// Expandable SQL Inspector Drawer Component
function SqlInspectorDrawer({
  sql,
  rows,
  onRunInSqlConsole,
}: {
  sql: string;
  rows?: any[];
  onRunInSqlConsole?: (sql: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      {/* Header Bar */}
      <div
        onClick={() => setOpen(!open)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Database size={12} className="text-accent" />
          <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider">
            &lt;&gt; Generated PostGIS SQL
          </span>
          {rows && rows.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
              {rows.length} rows
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="text-[9px] font-mono uppercase">
            {open ? "Hide" : "Inspect"}
          </span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </div>

      {/* Expandable Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border-t border-white/5 space-y-3"
          >
            {/* SQL Code Block */}
            <div className="relative group">
              <pre className="text-[11px] font-mono text-zinc-300 bg-black/60 p-3 rounded-lg border border-white/10 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {sql}
              </pre>

              {/* Action Buttons Toolbar */}
              <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono bg-white/5 hover:bg-accent/20 border border-white/10 hover:border-accent/40 text-zinc-300 hover:text-accent transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check size={11} className="text-glow" />
                        <span className="text-glow">Copied SQL</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>

                  {onRunInSqlConsole && (
                    <button
                      onClick={() => onRunInSqlConsole(sql)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent transition-all active:scale-95 shadow-[0_0_10px_rgba(46,230,198,0.15)]"
                    >
                      <Play size={10} fill="currentColor" />
                      <span>Run in SQL Console</span>
                    </button>
                  )}
                </div>

                {/* Export Buttons: .CSV and .Parquet ONLY per API Contract */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Download size={9} /> Export:
                  </span>
                  <a
                    href={`${apiUrl}/api/v1/export?sql=${encodeURIComponent(
                      sql
                    )}&format=csv`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-white/5 hover:bg-accent/20 border border-white/10 hover:border-accent/40 text-zinc-300 hover:text-accent transition-colors"
                  >
                    .CSV
                  </a>
                  <a
                    href={`${apiUrl}/api/v1/export?sql=${encodeURIComponent(
                      sql
                    )}&format=parquet`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-white/5 hover:bg-accent/20 border border-white/10 hover:border-accent/40 text-zinc-300 hover:text-accent transition-colors"
                  >
                    .Parquet
                  </a>
                </div>
              </div>
            </div>

            {/* Row Preview Table */}
            {rows && rows.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Data Preview ({Math.min(rows.length, 3)} of {rows.length} rows)
                </span>
                <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/30">
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        {Object.keys(rows[0]).map((k) => (
                          <th key={k} className="p-1.5 text-zinc-400 font-medium">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          {Object.values(r).map((v: any, j) => (
                            <td key={j} className="p-1.5 text-zinc-300">
                              {typeof v === "number"
                                ? v.toFixed(2)
                                : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Message Copy Button with animated feedback
function MessageCopyButton({ text, role }: { text: string; role: "user" | "assistant" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied to clipboard!" : role === "user" ? "Copy prompt" : "Copy response"}
      className={`
        p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all duration-150 backdrop-blur-sm border shadow-sm
        ${
          copied
            ? "bg-[#00FFC6]/20 border-[#00FFC6]/40 text-[#00FFC6]"
            : "bg-black/40 hover:bg-black/70 border-white/10 text-zinc-400 hover:text-white"
        }
      `}
    >
      {copied ? (
        <>
          <Check size={12} className="text-[#00FFC6]" />
          <span className="text-[10px] font-mono text-[#00FFC6]">Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span className="text-[10px] font-mono opacity-80">Copy</span>
        </>
      )}
    </button>
  );
}

// Typing skeleton for streaming
function TypingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5"
    >
      <div className="w-7 h-7 rounded-lg bg-glow/10 border border-glow/20 shrink-0 mt-0.5 flex items-center justify-center animate-pulse">
        <Zap size={12} className="text-glow" />
      </div>
      <div className="flex flex-col gap-2 flex-1 pt-1 opacity-70">
        <div className="skeleton h-3 w-[85%] rounded" />
        <div className="skeleton h-3 w-[65%] rounded" />
        <div className="skeleton h-3 w-[75%] rounded" />
      </div>
    </motion.div>
  );
}

export function ChatPanel({
  onRunInSqlConsole,
  onSelectFloat,
}: ChatPanelProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isTyping,
    error,
    mode,
    setMode,
    clearMessages,
  } = useChatStream();

  let selectedFloatId = "";
  let setSelectedFloatId: ((id: string) => void) | undefined;
  try {
    const op = useOperationalState();
    selectedFloatId = op.selectedFloatId;
    setSelectedFloatId = op.setSelectedFloatId;
  } catch {
    // Graceful fallback if rendered outside OperationalProvider
  }

  const prevFloatRef = useRef<string | null>(null);

  // Auto-paste query into chat input whenever user picks/selects any float on the map
  useEffect(() => {
    if (selectedFloatId && selectedFloatId !== prevFloatRef.current) {
      if (prevFloatRef.current !== null) {
        setInput(`Show me the vertical depth profile, temperature, and salinity observations for ARGO Float #${selectedFloatId}`);
      }
      prevFloatRef.current = selectedFloatId;
    }
  }, [selectedFloatId, setInput]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-bg-1/90 backdrop-blur-2xl border border-border-strong rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
      <div className="noise opacity-[0.03] absolute inset-0 pointer-events-none" />

      {/* ── Terminal Header & Mode Switcher ──────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 bg-bg-2/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/35 flex items-center justify-center shadow-[0_0_12px_rgba(46,230,198,0.2)]">
            <Terminal size={14} className="text-accent" />
          </div>
          <div>
            <div className="text-[12.5px] font-mono font-bold text-text tracking-tight uppercase flex items-center gap-1.5">
              <span>VARUNA Copilot</span>
              <span className="text-[9px] font-mono text-glow bg-glow/10 px-1.5 py-0.2 rounded border border-glow/25">
                v2.4
              </span>
            </div>
            <div className="text-[8.5px] font-mono text-text-muted uppercase tracking-[0.18em]">
              Marine Ecosystem Core
            </div>
          </div>
        </div>

        {/* Dual Mode Switcher Pill */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setMode("agent")}
            title="Multi-Step Task DAG Decomposition with Sub-Agents"
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-150
              ${
                mode === "agent"
                  ? "bg-accent/20 border border-accent/40 text-accent font-semibold shadow-[0_0_10px_rgba(46,230,198,0.2)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }
            `}
          >
            <BrainCircuit size={11} />
            <span>Agentic DAG</span>
          </button>
          <button
            onClick={() => setMode("quick")}
            title="Single-Shot Fast Query Response"
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-150
              ${
                mode === "quick"
                  ? "bg-accent-secondary/20 border border-accent-secondary/40 text-accent-secondary font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }
            `}
          >
            <Zap size={11} />
            <span>Quick Query</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              title="Clear Conversation"
              className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors ml-0.5"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages Scroll Area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
        {/* Empty State: Bento Prompt Chips */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col justify-center gap-4 py-2"
          >
            <div className="text-center mb-1">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 mx-auto flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(46,230,198,0.15)]">
                <BrainCircuit size={20} className="text-accent" />
              </div>
              <h3 className="text-xs font-mono font-bold text-text uppercase tracking-wider">
                Ask VARUNA Copilot
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Fusing INCOIS ARGO profiles with CMLRE marine biodiversity records
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STARTER_PROMPTS.map((p) => (
                <motion.button
                  key={p.label}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(p.query, mode)}
                  className="group text-left p-2.5 rounded-xl bg-white/3 hover:bg-white/6 border border-white/6 hover:border-accent/30 transition-all duration-150 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono text-accent uppercase tracking-widest">
                      {p.category}
                    </span>
                    <ArrowRight
                      size={11}
                      className="text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                  <span className="block text-[11px] font-mono font-medium text-zinc-300 group-hover:text-white mt-1 leading-snug">
                    {p.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message List */}
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={m.id || idx}
              variants={msgVariants}
              initial="hidden"
              animate="show"
              className={`flex gap-2.5 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`
                  shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 border text-[10px] font-mono font-bold select-none
                  ${
                    m.role === "user"
                      ? "bg-white/5 border-white/10 text-zinc-300"
                      : "bg-accent/15 border-accent/30 text-accent shadow-[0_0_10px_rgba(46,230,198,0.2)]"
                  }
                `}
              >
                {m.role === "user" ? "U" : "AI"}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`
                  group relative max-w-[92%] rounded-2xl p-4 text-[13.5px] leading-relaxed font-sans
                  ${
                    m.role === "user"
                      ? "bg-[#0E2C42] border border-[#2EE6C6]/30 text-white rounded-tr-sm shadow-md"
                      : "bg-[#081B2B]/95 border border-white/10 backdrop-blur-md rounded-tl-sm shadow-xl text-zinc-100"
                  }
                `}
              >
                {/* Message Quick Actions: Copy Button */}
                <div
                  className={`
                    absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 z-10
                  `}
                >
                  <MessageCopyButton text={m.content || ""} role={m.role} />
                </div>

                {m.role === "assistant" ? (
                  <>
                    {/* Live Multi-Agent Task DAG Execution Graph */}
                    {m.agent_trace && (
                      <AgentGraph
                        planId={m.agent_trace.plan_id}
                        steps={m.agent_trace.tasks}
                        plannerModel={m.agent_trace.planner_model}
                        totalLatencyMs={m.agent_trace.total_latency_ms}
                        topologicalOrder={m.agent_trace.topological_order}
                        isExecuting={m.isStreaming}
                      />
                    )}

                    {/* 1. Auto-suggested Visualization with Display / Hide Toggle (Displayed Above Answer) */}
                    {(m.metadata?.viz_specs || (m.metadata?.rows && m.metadata.rows.length > 0)) && (
                      <ExpandableChartDrawer
                        vizSpecs={m.metadata.viz_specs}
                        rows={m.metadata.rows}
                      />
                    )}

                    {/* 2. Main Markdown Answer (Shown Below the Graph) */}
                    <ProvenanceMarkdown
                      content={m.content || "..."}
                      onSelectFloat={onSelectFloat}
                    />

                    {/* Inspectable SQL Drawer with Copy, Run in Console, and Export */}
                    {m.metadata?.sql && (
                      <SqlInspectorDrawer
                        sql={m.metadata.sql}
                        rows={m.metadata.rows}
                        onRunInSqlConsole={onRunInSqlConsole}
                      />
                    )}

                    {/* Intent & Trace Metadata */}
                    {(m.metadata?.intent || m.trace_id) && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                        {m.metadata?.intent && (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-accent/10 border border-accent/20 text-accent font-mono uppercase tracking-wider">
                            {m.metadata.intent}
                          </span>
                        )}
                        {m.trace_id && (
                          <span
                            className="px-2 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-zinc-500 font-mono uppercase cursor-help"
                            title={`Trace ID: ${m.trace_id}`}
                          >
                            Trace: {m.trace_id.substring(0, 8)}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed font-sans pr-6">
                    {m.content}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* AI Typing Skeleton Indicator */}
        <AnimatePresence>
          {isTyping && messages[messages.length - 1]?.role === "user" && (
            <TypingSkeleton />
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/30 bg-red-500/10"
            >
              <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-[10px] font-bold">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-red-300 mb-1.5">
                  {error}
                </p>
                <button
                  onClick={() => sendMessage(input)}
                  className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors active:scale-95"
                >
                  <RefreshCw size={10} />
                  Retry Query
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input Box & Target Float Chip ───────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5 bg-bg-2/40 space-y-2">
        {selectedFloatId && (
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-[#071A2D] px-2.5 py-1.5 rounded-lg border border-[#2EE6C6]/30 shadow-sm gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-pulse" />
              <span>Target Picked: <b className="text-[#00FFC6]">Float #{selectedFloatId}</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const q = `Show me the vertical depth profile for temperature, salinity, and dissolved oxygen for ARGO Float #${selectedFloatId}`;
                  setInput(q);
                  sendMessage(q);
                }}
                className="px-2 py-0.5 rounded bg-[#2EE6C6]/15 hover:bg-[#2EE6C6]/30 border border-[#2EE6C6]/40 text-[#83FFE3] text-[10px] transition-all cursor-pointer flex items-center gap-1"
                title="Plot Vertical CTD Depth Profile"
              >
                <BarChart2 size={10} />
                <span>Depth Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = `Analyze sensor quality control and biofouling diagnostics for ARGO Float #${selectedFloatId}`;
                  setInput(q);
                  sendMessage(q);
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] transition-all cursor-pointer flex items-center gap-1"
                title="Run Sensor Quality Diagnostics"
              >
                <ShieldCheck size={10} />
                <span>Sensor QC</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFloatId?.("");
                  if (input.includes(`Float #${selectedFloatId}`) || input.includes(`float ${selectedFloatId}`)) {
                    setInput("");
                  }
                }}
                className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                title="Unpick and clear active target float"
              >
                <X size={10} />
                <span>Unpick</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isTyping}
            placeholder={
              isTyping
                ? mode === "agent"
                  ? "Orchestrating Multi-Agent Task DAG…"
                  : "Synthesizing answer…"
                : mode === "agent"
                ? "Ask compound query across INCOIS & CMLRE…"
                : "Ask quick single-shot question…"
            }
            className={`
              flex-1 bg-bg-2/60 rounded-xl px-4 py-2.5 text-[13px] font-sans
              text-text placeholder-zinc-500
              border transition-all duration-200 outline-none
              disabled:opacity-40
              ${
                focused
                  ? "border-accent ring-1 ring-accent/30 shadow-[0_0_15px_rgba(46,230,198,0.15)]"
                  : "border-border hover:border-border-strong"
              }
            `}
          />

          <motion.button
            type="submit"
            disabled={!input.trim() || isTyping}
            whileTap={{ scale: 0.94 }}
            className={`
              shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
              transition-all duration-150
              ${
                input.trim() && !isTyping
                  ? "bg-accent hover:bg-accent-bright text-bg-2 font-bold shadow-[0_0_15px_rgba(46,230,198,0.3)] cursor-pointer"
                  : "bg-white/5 text-zinc-600 cursor-not-allowed"
              }
            `}
          >
            <Send size={15} />
          </motion.button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
          <span>Mode: {mode === "agent" ? "Task DAG Orchestrator" : "Single-Shot"}</span>
          <span>OpenRouter · NVIDIA Nemotron 550B</span>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
