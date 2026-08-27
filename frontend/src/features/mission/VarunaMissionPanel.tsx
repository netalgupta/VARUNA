"use client";

import React from "react";
import Image from "next/image";
import { Sparkles, ExternalLink, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function VarunaMissionPanel() {
  const { setActiveNav, setCopilotOpen } = useOperationalState();

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none group">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-[#00FFC6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2v20M5 4v6a7 7 0 0 0 14 0V4" />
            </svg>
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            VARUNA
          </span>
        </div>

        <button
          onClick={() => setActiveNav("COMMAND_CENTER")}
          className="px-2 py-0.5 rounded bg-[#2EE6C6]/15 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black text-[9px] font-mono font-bold flex items-center gap-1 transition-all border border-[#2EE6C6]/30"
        >
          <span>Launch Command Center</span>
          <ArrowUpRight size={10} />
        </button>
      </div>

      {/* ── Cinematic Hero Background Container ───────────────────────────── */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-white/5 bg-[#020B14] min-h-[170px] flex flex-col justify-between p-3.5">
        {/* Background Artwork */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/varuna_mission_hero.jpg"
            alt="VARUNA Ocean Mission Station"
            fill
            className="object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
          />
          {/* Dark gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020B14] via-[#020B14]/70 to-transparent" />
        </div>

        {/* Mission Statement Hero Copy */}
        <div className="relative z-10 space-y-1">
          <h2 className="text-lg font-mono font-black text-white leading-tight tracking-wide">
            Understand.<br />
            Predict.<br />
            Protect.
          </h2>
          <p className="text-[11px] font-mono text-[#00FFC6] font-bold">
            India&apos;s Ocean. Powered by AI.
          </p>
          <p className="text-[9px] font-sans text-zinc-300 max-w-[280px] leading-relaxed">
            Bridging INCOIS physical oceanography + CMLRE marine living resources into a proactive national cognitive platform.
          </p>
        </div>

        {/* National Platform Stats Footer */}
        <div className="relative z-10 grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 font-mono text-[9px]">
          <div>
            <div className="font-bold text-white text-[11px]">3,800+</div>
            <div className="text-[#809AAB] text-[8px]">ARGO Floats</div>
          </div>
          <div>
            <div className="font-bold text-[#00FFC6] text-[11px]">500+</div>
            <div className="text-[#809AAB] text-[8px]">Marine Species</div>
          </div>
          <div>
            <div className="font-bold text-white text-[11px]">6</div>
            <div className="text-[#809AAB] text-[8px]">Ocean Basins</div>
          </div>
          <div>
            <div className="font-bold text-[#2EE6C6] text-[11px]">30M+</div>
            <div className="text-[#809AAB] text-[8px]">Lives Impacted</div>
          </div>
        </div>
      </div>
    </div>
  );
}
