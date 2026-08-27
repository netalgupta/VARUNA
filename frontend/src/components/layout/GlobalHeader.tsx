"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Activity, Clock, ShieldCheck, ChevronDown, Radio, Sparkles, Bot } from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

interface GlobalHeaderProps {
  onOpenSearch?: () => void;
}

export function GlobalHeader({ onOpenSearch }: GlobalHeaderProps) {
  const { systemHealth, setCopilotOpen, copilotOpen } = useOperationalState();
  const [timeStr, setTimeStr] = useState<string>("00:00:00 IST");

  useEffect(() => {
    const updateTime = () => {
      const time = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeStr(`${time} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLive = systemHealth.status === "LIVE";

  return (
    <header className="w-full h-16 bg-[#040914]/95 backdrop-blur-xl border-b border-sky-500/15 flex items-center justify-between px-6 z-40 shrink-0 select-none">
      {/* ── Left Branding ─────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-3.5 group">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/30 shadow-[0_0_18px_rgba(0,229,255,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(0,229,255,0.5)] transition-all shrink-0 bg-[#040914]">
          <Image
            src="/assets/varuna_logo.png"
            alt="Varuna Logo"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors font-sans">
              Varuna
            </span>
            <span className="text-[11px] px-2 py-0.2 bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 rounded-full font-semibold">
              v2.4
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            National Marine Data Backbone · INCOIS &amp; CMLRE
          </span>
        </div>
      </Link>

      {/* ── Center Global Search / Command Bar ─────────────────────────────── */}
      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full h-9 rounded-xl bg-[#081426]/90 border border-sky-500/20 hover:border-cyan-400/50 flex items-center justify-between px-3.5 text-xs text-slate-400 transition-all group shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <Search size={14} className="text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-slate-300 font-normal">
              Search floats, regions, species, datasets...
            </span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-[#0d1d36] border border-sky-500/30 text-[10px] font-mono text-cyan-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right Telemetry & Status ──────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* IST Clock */}
        <div className="text-xs font-mono font-medium text-slate-200 tracking-wider">
          {timeStr}
        </div>

        {/* Live System Dropdown Pill */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className="h-8 px-3 rounded-lg bg-[#081426]/90 hover:bg-[#0c1f38] border border-sky-500/20 hover:border-cyan-400/40 flex items-center gap-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="tracking-wide">LIVE SYSTEM</span>
          <ChevronDown size={12} className="text-slate-400" />
        </button>

        {/* Real-Time Waveform Heartbeat Monitor */}
        <div className="w-12 h-6 flex items-center justify-center opacity-90">
          <svg className="w-full h-full" viewBox="0 0 48 24" fill="none">
            <path
              d="M 0 12 L 12 12 L 16 4 L 22 20 L 26 8 L 30 14 L 34 12 L 48 12"
              stroke="#34d399"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-dash"
            />
          </svg>
        </div>
      </div>
    </header>
  );
}
