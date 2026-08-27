"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Bell,
  User,
  AlertTriangle,
  Flame,
  Fish,
  Compass,
  Home,
  MessageSquare,
  MapPin,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function MobileFieldPanel() {
  const { setSelectedAlertId, setActiveNav, setCopilotOpen } = useOperationalState();
  const [activeTab, setActiveTab] = useState<"Live" | "Ocean" | "Alerts" | "Bio">("Live");

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3 bg-[#0B1D2C]/90 relative select-none">
      {/* ── Panel Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Smartphone size={13} className="text-[#2EE6C6]" />
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Mobile / Field Mode
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#2EE6C6]/15 text-[#2EE6C6] rounded border border-[#2EE6C6]/30">
          FIELD PREVIEW
        </span>
      </div>

      {/* ── Mobile Phone Mockup Frame ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-1">
        <div className="w-full max-w-[260px] h-[340px] rounded-3xl bg-[#020B14] border-2 border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
          {/* Phone Top Notch / Status Bar */}
          <div className="h-5 px-3 flex items-center justify-between text-[9px] font-mono text-zinc-400 shrink-0">
            <span>9:41</span>
            <div className="w-12 h-2.5 rounded-full bg-black/80 mx-auto" />
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>

          {/* App Header */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white tracking-widest">
                VARUNA
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Bell size={11} className="hover:text-white" />
              <User size={11} className="hover:text-white" />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-1.5 flex gap-1 shrink-0 overflow-x-auto">
            {(["Live", "Ocean", "Alerts", "Bio"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
                  activeTab === tab
                    ? "bg-[#2EE6C6] text-black font-bold"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Mobile Main Body */}
          <div className="flex-1 px-3 py-1 space-y-2 overflow-y-auto custom-scrollbar">
            {/* Mini MHW Anomaly Card */}
            <div
              onClick={() => setSelectedAlertId(101)}
              className="p-2 rounded-xl bg-gradient-to-r from-red-950/40 to-[#0B1D2C] border border-red-500/30 cursor-pointer"
            >
              <div className="flex items-center justify-between text-[8px] font-mono">
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <Flame size={9} /> MHW
                </span>
                <span className="text-red-400 font-bold">CRITICAL</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-white mt-0.5">
                Arabian Sea
              </div>
              <div className="text-[9px] font-mono text-red-400 font-bold">
                +3.2°C Anomaly
              </div>
            </div>

            {/* Active Alerts List */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-zinc-400 font-bold">Active Alerts (7)</span>
                <span className="text-[#2EE6C6] cursor-pointer">View All →</span>
              </div>

              {/* Alert 1 */}
              <div
                onClick={() => setSelectedAlertId(101)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <div>
                    <div className="text-[9px] font-mono font-bold text-white">Marine Heatwave</div>
                    <div className="text-[8px] font-mono text-zinc-400">Arabian Sea</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-red-400 font-bold">+3.4°C &gt;</span>
              </div>

              {/* Alert 2 */}
              <div
                onClick={() => setSelectedAlertId(103)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <div>
                    <div className="text-[9px] font-mono font-bold text-white">Hypoxia Expansion</div>
                    <div className="text-[8px] font-mono text-zinc-400">Bay of Bengal</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-orange-400 font-bold">High &gt;</span>
              </div>

              {/* Alert 3 */}
              <div
                onClick={() => setSelectedAlertId(102)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <div>
                    <div className="text-[9px] font-mono font-bold text-white">Coral Stress</div>
                    <div className="text-[8px] font-mono text-zinc-400">Gulf of Mannar</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-400 font-bold">Moderate &gt;</span>
              </div>
            </div>
          </div>

          {/* Bottom Mobile Dock */}
          <div className="h-9 px-3 bg-[#0B1D2C] border-t border-white/10 flex items-center justify-between text-[8px] font-mono text-zinc-400 shrink-0">
            <button className="flex flex-col items-center gap-0.5 text-[#2EE6C6]">
              <Home size={10} />
              <span>Home</span>
            </button>
            <button onClick={() => setCopilotOpen(true)} className="flex flex-col items-center gap-0.5 hover:text-white">
              <MessageSquare size={10} />
              <span>Copilot</span>
            </button>
            <button className="w-6 h-6 -mt-3 rounded-full bg-[#00FFC6] text-black flex items-center justify-center shadow-[0_0_10px_#00FFC6]">
              <Compass size={12} />
            </button>
            <button onClick={() => setActiveNav("OCEAN")} className="flex flex-col items-center gap-0.5 hover:text-white">
              <MapPin size={10} />
              <span>Map</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 hover:text-white">
              <MoreHorizontal size={10} />
              <span>More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
