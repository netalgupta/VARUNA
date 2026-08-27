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
    <header className="w-full h-14 bg-[#020B14]/90 backdrop-blur-md border-b border-[#2EE6C6]/15 flex items-center justify-between px-4 z-40 shrink-0 select-none">
      {/* ── Left Branding ─────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-3 group">
        {/* Stylized Trident Mark */}
        <div className="w-8 h-8 rounded-lg bg-[#2EE6C6]/10 border border-[#2EE6C6]/40 flex items-center justify-center shadow-[0_0_12px_rgba(46,230,198,0.25)] group-hover:scale-105 transition-transform">
          <svg className="w-4 h-4 text-[#00FFC6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20" />
            <path d="M5 4v6a7 7 0 0 0 14 0V4" />
            <circle cx="12" cy="2" r="1" fill="#00FFC6" />
            <circle cx="5" cy="4" r="1" fill="#00FFC6" />
            <circle cx="19" cy="4" r="1" fill="#00FFC6" />
          </svg>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-mono tracking-widest text-white group-hover:text-[#00FFC6] transition-colors">
              VARUNA
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#2EE6C6]/15 text-[#2EE6C6] rounded border border-[#2EE6C6]/30 font-semibold">
              PROD
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#809AAB] tracking-wider uppercase flex items-center gap-1.5">
            National Marine Data Backbone <span className="text-[#2EE6C6]">→</span> INCOIS ⇄ CMLRE
          </span>
        </div>
      </Link>

      {/* ── Center Global Search / Command Bar ─────────────────────────────── */}
      <div className="flex-1 max-w-xl mx-6 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full h-9 rounded-lg bg-[#0B1D2C]/80 border border-[#2EE6C6]/20 hover:border-[#2EE6C6]/50 flex items-center justify-between px-3 text-xs text-[#809AAB] transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#2EE6C6] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-sans text-zinc-300">
              Search ecosystem, region, species, datasets...
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-400">
              ⌘ K
            </kbd>
          </div>
        </button>
      </div>

      {/* ── Right Telemetry & Status ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Ask Chatbot Quick Button */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className={`h-8 px-3 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
            copilotOpen
              ? "bg-[#2EE6C6] text-black border-[#2EE6C6] shadow-[0_0_15px_rgba(46,230,198,0.4)]"
              : "bg-[#0B1D2C] text-[#2EE6C6] border-[#2EE6C6]/30 hover:border-[#2EE6C6] hover:bg-[#2EE6C6]/10"
          }`}
        >
          <Bot size={13} className={copilotOpen ? "animate-bounce" : ""} />
          <span>CHATBOT</span>
        </button>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B1D2C]/90 border border-white/10 text-xs font-mono text-zinc-300">
          <Clock size={12} className="text-[#2EE6C6]" />
          <span>{timeStr}</span>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0B1D2C]/90 border border-white/10">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-[#00FFC6] shadow-[0_0_8px_#00FFC6]" : "bg-red-500 shadow-[0_0_8px_#EF4444]"
            }`}
          />
          <span className="text-[11px] font-mono font-bold tracking-wider text-white flex items-center gap-1">
            {systemHealth.status}
            <ChevronDown size={11} className="text-zinc-400" />
          </span>
        </div>
      </div>
    </header>
  );
}
