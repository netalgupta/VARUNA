"use client";

import React from "react";
import Image from "next/image";
import {
  Radio,
  Layers,
  Thermometer,
  Droplets,
  Activity,
  Gauge,
  Sliders,
  Maximize2,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function DeepDiveModePanel() {
  const { selectedFloatId } = useOperationalState();

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none group">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Radio size={12} className="text-[#00FFC6]" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Deep Dive Mode · ARGO {selectedFloatId}
          </span>
        </div>

        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#00FFC6]/15 text-[#00FFC6] rounded border border-[#00FFC6]/30">
          PROFILING PHASE
        </span>
      </div>

      {/* ── Main Underwater Subsea View ───────────────────────────────────── */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-white/5 bg-[#020B14] min-h-[170px] flex items-center justify-between p-3">
        {/* Background Image: ARGO Float Probe In-Situ */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/argo_deep_probe.jpg"
            alt="ARGO Submersible Probe"
            fill
            className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
          />
          {/* Depth gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020B14]/90 via-transparent to-[#020B14]/80" />
        </div>

        {/* Left Telemetry Overlays */}
        <div className="relative z-10 space-y-1.5 font-mono text-[10px]">
          <div className="p-1.5 rounded bg-black/60 border border-white/10 backdrop-blur-md">
            <span className="text-[8px] text-zinc-400 uppercase block">Current Depth</span>
            <span className="text-sm font-bold text-[#00FFC6]">1250 m</span>
          </div>

          <div className="p-1.5 rounded bg-black/60 border border-white/10 backdrop-blur-md space-y-0.5">
            <div className="flex justify-between gap-3 text-zinc-300">
              <span>Pressure</span>
              <span className="text-white font-bold">125.2 dbar</span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-300">
              <span>Temperature</span>
              <span className="text-[#FF4B4B] font-bold">12.4 °C</span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-300">
              <span>DOXY</span>
              <span className="text-[#00FFC6] font-bold">72.1 µmol/kg</span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-300">
              <span>Salinity</span>
              <span className="text-[#38BDF8] font-bold">34.9 PSU</span>
            </div>
          </div>
        </div>

        {/* Right Depth Strata Markers */}
        <div className="relative z-10 flex flex-col justify-between h-full text-[8px] font-mono text-zinc-400 py-1 text-right">
          <span>0 m</span>
          <span>500 m</span>
          <span className="text-[#00FFC6] font-bold">1000 m ←</span>
          <span>1500 m</span>
          <span>2000 m</span>
        </div>

        {/* Bottom Inset: CTD Sensor Waveform */}
        <div className="absolute bottom-2 right-14 z-10 w-28 h-10 rounded bg-black/70 border border-white/10 p-1 backdrop-blur-md hidden sm:block">
          <div className="text-[7px] font-mono text-zinc-400">CTD Sensor Waveform</div>
          <svg className="w-full h-5" viewBox="0 0 100 20" fill="none">
            <path
              d="M 0 10 Q 20 2, 40 12 T 70 8 T 100 15"
              stroke="#00FFC6"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
