"use client";

import React, { useState } from "react";
import {
  Flame,
  AlertTriangle,
  Play,
  Pause,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

const TIMELINE_STEPS = [
  "Aug 07",
  "Aug 08",
  "Aug 09",
  "Aug 10",
  "Aug 11",
  "Aug 12",
  "Aug 13",
  "Aug 14",
];

export function EarlyWarningRoomPanel() {
  const { activeAnomaly, setSelectedAlertId, setActiveNav } = useOperationalState();
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Heatwave" | "Hypoxia" | "Coral Stress" | "Forecasts"
  >("Overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(7);

  const anomalyValue = activeAnomaly ? `+${activeAnomaly.anomaly_value}°C` : "+3.4°C";
  const oceanBasin = activeAnomaly
    ? activeAnomaly.ocean_basin.toUpperCase().replace("_", " ")
    : "ARABIAN SEA";
  const duration = activeAnomaly ? `${activeAnomaly.duration_days} days` : "12 days";

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none">
      {/* ── Header & Sub-Tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 mb-2.5 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#FF4B4B]/15 border border-[#FF4B4B]/40 flex items-center justify-center">
            <Flame size={12} className="text-[#FF4B4B]" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Early-Warning Room
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
          {(["Overview", "Heatwave", "Hypoxia", "Coral Stress", "Forecasts"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#FF4B4B] text-white font-bold shadow-[0_0_10px_rgba(255,75,75,0.3)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Main Content: Heatmap Anomaly Grid + Alert Card ───────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-[190px]">
        {/* Left Anomaly Thermal Contour Heatmap Visualizer */}
        <div className="col-span-7 bg-[#0E2435] rounded-lg border border-white/5 p-2 flex flex-col justify-between relative overflow-hidden">
          {/* Top Region Label */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 z-10">
            <span className="flex items-center gap-1 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4B4B] animate-ping" />
              {activeAnomaly ? `${oceanBasin} ${activeAnomaly.alert_type === "MARINE_HEATWAVE" ? "Heatwave" : "Hypoxia"}` : "Arabian Sea MHW Thermal Anomaly"}
            </span>
            <span>Hobday (2016) P90</span>
          </div>

          {/* Thermal Heatmap Gradient Field & Warning Epicenter */}
          <div className="relative w-full h-24 my-auto rounded bg-[#071A2D] overflow-hidden flex items-center justify-center">
            {/* Multi-layered radial thermal contours */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(255,75,75,0.7)_0%,rgba(245,158,11,0.4)_40%,rgba(46,230,198,0.1)_70%,transparent_100%)]" />

            {/* Subtle topographic grid */}
            <div className="absolute inset-0 grid-ocean opacity-40" />

            {/* Warning Epicenter Marker */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#FF4B4B]/30 border border-[#FF4B4B] flex items-center justify-center animate-pulse shadow-[0_0_15px_#FF4B4B]">
                <AlertTriangle size={12} className="text-white" />
              </div>
            </div>
          </div>

          {/* Timeline Playback Bar */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/5 z-10">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-5 h-5 rounded bg-[#2EE6C6]/20 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </button>

            <div className="flex-1 flex justify-between text-[8px] font-mono text-zinc-400">
              {TIMELINE_STEPS.map((step, idx) => (
                <button
                  key={step}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`px-1 py-0.5 rounded ${
                    currentStepIndex === idx
                      ? "text-[#00FFC6] font-bold bg-[#00FFC6]/15"
                      : "hover:text-white"
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Anomaly Telemetry Card */}
        <div className="col-span-5 bg-[#0E2435] rounded-lg border border-red-500/30 p-2.5 flex flex-col justify-between text-[10px] font-mono">
          <div>
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="text-[#FF4B4B] font-bold">{activeAnomaly?.alert_type ? activeAnomaly.alert_type.replace("_", " ") : "Marine Heatwave"}</span>
              <AlertTriangle size={11} className="text-[#FF4B4B]" />
            </div>

            <div className="text-xs font-bold text-white mb-0.5">{oceanBasin}</div>

            {/* Anomaly Value & Curve */}
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-[#FF4B4B]">{anomalyValue}</span>
              <span className="text-[8px] text-zinc-400">Above Baseline</span>
            </div>

            {/* Mini Sparkline */}
            <svg className="w-full h-5 my-1" viewBox="0 0 100 20" fill="none">
              <path d="M 0 16 Q 30 14, 60 8 T 100 3" stroke="#FF4B4B" strokeWidth="1.5" />
            </svg>

            {/* Summary Metrics */}
            <div className="space-y-0.5 pt-1 border-t border-white/5 text-[9px] text-zinc-400">
              <div className="flex justify-between">
                <span>Severity</span>
                <span className="text-[#FF4B4B] font-bold">{activeAnomaly?.severity || "CRITICAL"}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration</span>
                <span className="text-white font-bold">{duration}</span>
              </div>
              <div className="flex justify-between">
                <span>Affected Area</span>
                <span className="text-white font-bold" suppressHydrationWarning>
                  {activeAnomaly
                    ? `${new Intl.NumberFormat('en-US').format(Math.round((activeAnomaly.lat_max - activeAnomaly.lat_min) * (activeAnomaly.lon_max - activeAnomaly.lon_min) * 111 * 111))} km²`
                    : "145,620 km²"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Affected Species</span>
                <span className="text-[#2EE6C6] font-bold">{activeAnomaly?.affected_species?.length || 12}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setActiveNav("ALERTS")}
            className="w-full h-6 rounded bg-[#FF4B4B]/20 hover:bg-[#FF4B4B] text-white text-[9px] font-bold flex items-center justify-center gap-1 transition-all mt-1 shadow-sm"
          >
            <span>View Impact Report</span>
            <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
