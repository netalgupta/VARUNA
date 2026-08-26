"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Globe, Activity, Clock, ShieldCheck, ChevronDown, Radio, Sparkles, Bot } from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

interface GlobalHeaderProps {
  onOpenSearch?: () => void;
}

export function GlobalHeader({ onOpenSearch }: GlobalHeaderProps) {
  const { systemHealth, setCopilotOpen, copilotOpen } = useOperationalState();
  const [timeStr, setTimeStr] = useState<string>("14:32:08 UTC");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      setTimeStr(`${hours}:${minutes}:${seconds} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLive = systemHealth.status === "LIVE";

  return (
    <header className="w-full h-16 bg-[#060c18]/95 backdrop-blur-lg border-b border-sky-500/20 flex items-center justify-between px-6 z-40 shrink-0 select-none shadow-md">
      {/* ── Left Branding ─────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-3.5 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0e1c36] to-[#0a1324] border border-sky-500/35 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)] group-hover:scale-105 transition-transform shrink-0">
          <Globe size={20} className="text-sky-400" />
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors font-sans">
              Varuna
            </span>
            <span className="text-xs px-2 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-md font-semibold tracking-wide">
              v2.4
            </span>
          </div>
          <span className="text-xs text-slate-300 font-medium tracking-normal mt-0.5">
            National Marine Data Backbone · INCOIS & CMLRE
          </span>
        </div>
      </Link>

      {/* ── Center Global Search / Command Bar ─────────────────────────────── */}
      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full h-10 rounded-lg bg-[#0a1426]/90 border border-sky-500/25 hover:border-sky-400/60 flex items-center justify-between px-3.5 text-sm text-slate-300 transition-all group backdrop-blur-md shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <Search size={16} className="text-sky-400 group-hover:text-sky-300 transition-colors" />
            <span className="text-sm text-slate-300 font-normal">
              Search floats, marine regions, species, datasets...
            </span>
          </div>
          <kbd className="px-2 py-0.5 rounded-md bg-[#0e1c36] border border-sky-500/30 text-xs font-mono text-sky-300 font-medium shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right Telemetry & Status ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Chatbot Button */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className={`h-10 px-4 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            copilotOpen
              ? "bg-sky-500 text-white border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.45)]"
              : "bg-[#0a1426]/90 hover:bg-[#0e1c36] text-sky-200 border-sky-500/30 hover:border-sky-400/60"
          }`}
        >
          <Bot size={16} />
          <span>Assistant</span>
        </button>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-lg bg-[#0a1426]/90 border border-sky-500/20 text-sm font-mono text-slate-200">
          <Clock size={15} className="text-sky-400" />
          <span className="font-medium">{timeStr}</span>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-lg bg-[#0a1426]/90 border border-sky-500/20">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-500 shadow-[0_0_8px_#f87171]"
            }`}
          />
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            {isLive ? "Live System" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
