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
    <header className="w-full h-12 bg-[#09090b] border-b border-white/[0.08] flex items-center justify-between px-4 z-40 shrink-0 select-none text-xs">
      {/* ── Left Branding ─────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-zinc-100">
          <Globe size={14} className="text-blue-500" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
              Varuna
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded font-medium">
              v2.4
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">
            National Marine Data Backbone · INCOIS & CMLRE
          </span>
        </div>
      </Link>

      {/* ── Center Global Search / Command Bar ─────────────────────────────── */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full h-8 rounded-md bg-zinc-900/90 border border-white/[0.08] hover:border-zinc-700 flex items-center justify-between px-2.5 text-xs text-zinc-500 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-zinc-500 group-hover:text-zinc-300" />
            <span className="text-xs text-zinc-400">
              Search floats, regions, species, datasets...
            </span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/[0.06] text-[10px] font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right Telemetry & Status ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Chatbot Button */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className={`h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            copilotOpen
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]"
          }`}
        >
          <Bot size={13} />
          <span>Assistant</span>
        </button>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/80 border border-white/[0.06] text-xs font-mono text-zinc-400">
          <Clock size={12} className="text-zinc-500" />
          <span>{timeStr}</span>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/80 border border-white/[0.06]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-[11px] font-medium text-zinc-300">
            {isLive ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
