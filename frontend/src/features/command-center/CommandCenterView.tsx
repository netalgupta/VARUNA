"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronRight,
  TrendingUp,
  Activity,
  Flame,
  Radio,
  Satellite,
  Compass,
  Search,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

// Feature Subpanels
import { DeepDiveModePanel } from "@/features/deep-dive/DeepDiveModePanel";
import { FloatDirectoryPanel } from "@/features/command-center/FloatDirectoryPanel";

const VarunaMap = dynamic(
  () => import("@/features/ocean-map/VarunaMap").then((m) => ({ default: m.VarunaMap })),
  { ssr: false }
);

export function CommandCenterView() {
  const {
    floats,
    anomalies,
    biodiversity,
    selectedFloatId,
    setSelectedFloatId,
    selectedFloatProfile,
    setActiveNav,
    selectedSpecies,
    setSelectedSpecies,
  } = useOperationalState();

  const [speciesQuery, setSpeciesQuery] = useState("");
  const [isSpeciesSearchOpen, setIsSpeciesSearchOpen] = useState(false);

  const speciesResults = useMemo(() => {
    const query = speciesQuery.trim().toLowerCase();
    return biodiversity
      .filter((species) => {
        if (!query) return true;
        return (
          species.scientific_name.toLowerCase().includes(query) ||
          species.common_name.toLowerCase().includes(query) ||
          species.family?.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [biodiversity, speciesQuery]);

  // ── 1. Telemetry Calculations from Real Data ─────────────────────────────
  const targetFloat = useMemo(() => {
    return floats.find((f) => String(f.wmo_id) === String(selectedFloatId)) || floats[0];
  }, [floats, selectedFloatId]);

  const floatWmo = selectedFloatId || targetFloat?.wmo_id || "7902385";

  const floatLat = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.latitude != null) {
      return Number(selectedFloatProfile.latest_surface.latitude).toFixed(2);
    }
    return targetFloat ? targetFloat.last_lat.toFixed(2) : "15.41";
  }, [selectedFloatProfile, targetFloat]);

  const floatLon = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.longitude != null) {
      return Number(selectedFloatProfile.latest_surface.longitude).toFixed(2);
    }
    return targetFloat ? targetFloat.last_lon.toFixed(2) : "68.44";
  }, [selectedFloatProfile, targetFloat]);

  const surfaceTemp = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.temp != null) {
      return Number(selectedFloatProfile.latest_surface.temp).toFixed(2);
    }
    return "--";
  }, [selectedFloatProfile]);

  const surfaceAnomaly = useMemo(() => {
    const val = Number(surfaceTemp);
    const diff = val - 28.20;
    if (diff >= 0) return `▲ +${diff.toFixed(2)}°C Anomaly`;
    return `▼ ${diff.toFixed(2)}°C Anomaly`;
  }, [surfaceTemp]);

  const surfaceSal = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.psal != null) {
      return Number(selectedFloatProfile.latest_surface.psal).toFixed(2);
    }
    return "--";
  }, [selectedFloatProfile]);

  const surfaceDoxy = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.doxy != null) {
      return Number(selectedFloatProfile.latest_surface.doxy).toFixed(1);
    }
    if (selectedFloatProfile?.deepest_record?.doxy != null) {
      return Number(selectedFloatProfile.deepest_record.doxy).toFixed(1);
    }
    return "--";
  }, [selectedFloatProfile]);

  const latestSurfaceDepth = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.depth_m != null) {
      return Number(selectedFloatProfile.latest_surface.depth_m).toFixed(1);
    }
    if (selectedFloatProfile?.latest_surface?.depth != null) {
      return Number(selectedFloatProfile.latest_surface.depth).toFixed(1);
    }
    if (selectedFloatProfile?.latest_surface?.pres != null) {
      return Number(selectedFloatProfile.latest_surface.pres).toFixed(1);
    }
    return "--";
  }, [selectedFloatProfile]);

  const latestCycle = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.cycle_number != null) {
      return selectedFloatProfile.latest_surface.cycle_number;
    }
    return targetFloat?.total_profiles || 100;
  }, [selectedFloatProfile, targetFloat]);

  const latestDateFormatted = useMemo(() => {
    const rawTime = selectedFloatProfile?.latest_surface?.time || targetFloat?.last_seen;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      } catch {
        // Fallback
      }
      return String(rawTime).split("T")[0];
    }
    return "Aug 11, 2026";
  }, [selectedFloatProfile, targetFloat]);

  const latestTimeFormatted = useMemo(() => {
    const rawTime = selectedFloatProfile?.latest_surface?.time || targetFloat?.last_seen;
    if (rawTime && String(rawTime).includes("T")) {
      return String(rawTime).split("T")[1]?.slice(0, 5) + " UTC";
    }
    return "23:16 UTC";
  }, [selectedFloatProfile, targetFloat]);

  return (
    <div className="flex flex-col h-full space-y-3.5 overflow-y-auto custom-scrollbar select-none pr-1">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP 4 HERO KPI METRIC STRIP (MATCHING REFERENCE IMAGE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: SELECTED FLOAT */}
        <div
          onClick={() => setActiveNav("FLOATS")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-cyan-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Selected Float
            </span>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span>TRANSMITTING</span>
            </div>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              ARGO #{floatWmo}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-mono font-bold tracking-wide">
              {floatLat}°N &nbsp; {floatLon}°E
            </span>
          </div>
        </div>

        {/* KPI 2: SURFACE TEMP + AMBER SPARKLINE */}
        <div
          onClick={() => setActiveNav("FORECASTS")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-amber-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Surface Temp
            </span>
            <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
              {surfaceAnomaly}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {surfaceTemp}°C
            </div>
          </div>

          {/* Glowing Amber Mini Sparkline */}
          <div className="w-full h-6 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 18 Q 15 16, 30 19 T 60 12 T 85 8 T 100 6"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 18 Q 15 16, 30 19 T 60 12 T 85 8 T 100 6 L 100 24 L 0 24 Z"
                fill="url(#amber-spark-grad)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="amber-spark-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* KPI 3: SURFACE SALINITY + CYAN SPARKLINE */}
        <div
          onClick={() => setActiveNav("OCEAN")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-cyan-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Surface Salinity
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              DOXY {surfaceDoxy} µmol/kg
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {surfaceSal} PSU
            </div>
          </div>

          {/* Glowing Cyan Mini Sparkline */}
          <div className="w-full h-6 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 16 Q 20 20, 40 14 T 75 10 T 100 8"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 16 Q 20 20, 40 14 T 75 10 T 100 8 L 100 24 L 0 24 Z"
                fill="url(#cyan-spark-grad)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="cyan-spark-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* KPI 4: LATEST SURFACE CAST DEPTH + PURPLE SPARKLINE */}
        <div
          onClick={() => setActiveNav("FLOATS")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-purple-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Surface Cast Depth
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-semibold">
              Cycle #{latestCycle}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {latestSurfaceDepth} m
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{latestDateFormatted}</span>
            <span>{latestTimeFormatted}</span>
          </div>

          {/* Glowing Purple Mini Sparkline */}
          <div className="w-full h-6 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 14 Q 25 8, 50 16 T 80 12 T 100 6"
                fill="none"
                stroke="#A78BFA"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 14 Q 25 8, 50 16 T 80 12 T 100 6 L 100 24 L 0 24 Z"
                fill="url(#purple-spark-grad)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="purple-spark-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CENTRAL SECTION: INTERACTIVE MAP (7 COLS) & RIGHT RAIL (5 COLS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 min-h-[540px]">
        {/* ── Central Interactive MapLibre Map (7 Cols) ────────────────────── */}
        <div className="xl:col-span-7 bg-[#040a14] border border-sky-500/20 rounded-xl overflow-hidden relative group shadow-2xl h-[540px]">
          <VarunaMap />
        </div>

        {/* ── Right Tactical Intelligence Column (5 Cols) ──────────────────── */}
        <div className="xl:col-span-5 flex flex-col justify-between space-y-3 h-[540px]">
          {/* Top Half: Float Directory Selector (235px) */}
          <FloatDirectoryPanel />

          {/* Bottom Half: Species Search + Deep Dive Mode with Subsea Probe */}
          <div className="h-[290px] flex flex-col gap-2">
            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3 top-2.5 text-cyan-400" />
              <input
                type="search"
                value={speciesQuery}
                onFocus={() => setIsSpeciesSearchOpen(true)}
                onChange={(event) => {
                  setSpeciesQuery(event.target.value);
                  setIsSpeciesSearchOpen(true);
                }}
                placeholder="Search species by name or family..."
                aria-label="Search species by name or family"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#071526]/95 border border-sky-500/25 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-cyan-400 shadow-lg"
              />
              {isSpeciesSearchOpen && (
                <div className="absolute left-0 right-0 top-10 z-50 max-h-44 overflow-y-auto rounded-lg bg-[#091a30] border border-cyan-500/35 shadow-2xl p-1 font-mono">
                  {speciesResults.length > 0 ? speciesResults.map((species) => (
                    <button
                      key={species.scientific_name}
                      type="button"
                      onClick={() => {
                        setSelectedSpecies(species.scientific_name);
                        setSpeciesQuery("");
                        setIsSpeciesSearchOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                        species.scientific_name === selectedSpecies
                          ? "bg-cyan-500/25 text-white"
                          : "text-slate-300 hover:bg-cyan-500/15 hover:text-white"
                      }`}
                    >
                      <span className="block text-[11px] italic font-bold">{species.scientific_name}</span>
                      <span className="block text-[9px] text-slate-400">
                        {species.common_name || species.family || "CMLRE catalog record"}
                      </span>
                    </button>
                  )) : (
                    <div className="px-2.5 py-2 text-[10px] text-slate-500">No matching species</div>
                  )}
                </div>
              )}
            </div>

            <DeepDiveModePanel
              isCollapsible={true}
              onDeselect={() => setSelectedFloatId("")}
            />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BOTTOM SECTION: OCEAN INTELLIGENCE (8 COLS) & SYSTEM STATUS (4 COLS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pb-2">
        {/* ── Ocean Intelligence (8 Cols) ──────────────────────────────────── */}
        <div className="lg:col-span-8 p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 mb-3">
            <span className="font-mono font-bold text-slate-200 text-xs tracking-wider uppercase">
              Ocean Intelligence
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              3 Active Events Detected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Marine Heat Anomaly */}
            <div
              onClick={() => setActiveNav("ALERTS")}
              className="p-3 rounded-lg bg-[#071324]/80 border border-sky-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
            >
              <div className="h-16 rounded-md bg-gradient-to-br from-amber-600/30 via-rose-600/20 to-[#040914] border border-amber-500/30 p-2 flex flex-col justify-between relative overflow-hidden mb-2">
                <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Arabian Sea
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  +3.8°C Anomaly
                </span>
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                Marine Heat Anomaly
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                87 observations in zone
              </div>
            </div>

            {/* Card 2: Phytoplankton Bloom */}
            <div
              onClick={() => setActiveNav("BIODIVERSITY")}
              className="p-3 rounded-lg bg-[#071324]/80 border border-sky-500/20 hover:border-emerald-400/40 transition-all cursor-pointer group"
            >
              <div className="h-16 rounded-md bg-gradient-to-br from-emerald-600/30 via-cyan-600/20 to-[#040914] border border-emerald-500/30 p-2 flex flex-col justify-between relative overflow-hidden mb-2">
                <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                  Bay of Bengal
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  Bloom 92% Conf.
                </span>
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                Phytoplankton Bloom
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                High chlorophyll-a surge
              </div>
            </div>

            {/* Card 3: Low Oxygen Zone */}
            <div
              onClick={() => setActiveNav("ALERTS")}
              className="p-3 rounded-lg bg-[#071324]/80 border border-sky-500/20 hover:border-cyan-400/40 transition-all cursor-pointer group"
            >
              <div className="h-16 rounded-md bg-gradient-to-br from-cyan-600/30 via-blue-600/20 to-[#040914] border border-cyan-500/30 p-2 flex flex-col justify-between relative overflow-hidden mb-2">
                <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  Arabian Sea
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  600–900m Strata
                </span>
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                Low Oxygen Zone
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hypoxic core compression
              </div>
            </div>
          </div>
        </div>

        {/* ── System Status & Live Radar (4 Cols) ──────────────────────────── */}
        <div className="lg:col-span-4 p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 mb-2">
            <span className="font-mono font-bold text-slate-200 text-xs tracking-wider uppercase">
              System Status
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span>14:26:10 UTC DATA SYNC</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 my-1">
            {/* Telemetry Counts */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_4px_#00e5ff]" />
                <span className="font-bold text-white">{floats.length || 55}</span> ARGO Active Floats
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                <span className="font-bold text-white">{biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"}</span> CMLRE Species Records
              </div>
            </div>

            {/* Circular Radar Sweep Widget */}
            <div className="w-16 h-16 rounded-full border border-cyan-400/40 relative flex items-center justify-center bg-[#061022] shadow-[0_0_12px_rgba(0,229,255,0.2)] shrink-0 overflow-hidden">
              {/* Radar Grid Circles */}
              <div className="w-10 h-10 rounded-full border border-cyan-500/20 absolute" />
              <div className="w-5 h-5 rounded-full border border-cyan-500/25 absolute" />
              {/* Radar Crosshairs */}
              <div className="w-full h-[1px] bg-cyan-500/25 absolute" />
              <div className="h-full w-[1px] bg-cyan-500/25 absolute" />
              {/* Radar Blips */}
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute top-3 left-4 shadow-[0_0_6px_#00e5ff]" />
              <div className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-3 right-5 shadow-[0_0_4px_#34d399]" />
              {/* Animated Rotating Sweep Line */}
              <div className="w-full h-full absolute inset-0 animate-radar-sweep pointer-events-none">
                <div className="w-1/2 h-1/2 border-r-2 border-cyan-400 bg-gradient-to-br from-cyan-400/30 to-transparent rounded-tl-full" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-sky-500/15 flex items-center justify-between text-[11px] text-slate-400">
            <span>INCOIS + CMLRE Backbone</span>
            <span className="text-emerald-400 font-mono font-semibold">100% Operational</span>
          </div>
        </div>
      </section>
    </div>
  );
}
