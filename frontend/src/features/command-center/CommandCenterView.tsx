"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  ChevronRight,
  TrendingUp,
  Activity,
  Flame,
  Radio,
  Satellite,
  Compass,
  Fish,
  Thermometer,
  Droplets,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

// Feature Subpanels
import { DeepDiveModePanel } from "@/features/deep-dive/DeepDiveModePanel";
import { FloatDirectoryPanel } from "@/features/command-center/FloatDirectoryPanel";
import { SpeciesTaxonomicProfilePanel } from "@/features/command-center/SpeciesTaxonomicProfilePanel";

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
    selectedSpecies,
    setSelectedSpecies,
    selectedBioRecord,
    setSelectedBioRecord,
    selectedEntityType,
    setSelectedEntityType,
    setActiveNav,
    flyToCoordinates,
  } = useOperationalState();

  // ── 1. Telemetry Calculations from Real Data (ARGO FLOAT MODE) ───────────
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
    if (surfaceTemp === "--" || isNaN(Number(surfaceTemp))) {
      return "Analyzing...";
    }
    const val = Number(surfaceTemp);
    const diff = val - 28.20;
    if (diff >= 0) return `▲ +${diff.toFixed(2)}°C Anomaly`;
    return `▼ ${Math.abs(diff).toFixed(2)}°C Anomaly`;
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
    const rawPres =
      selectedFloatProfile?.latest_surface?.pres ??
      selectedFloatProfile?.latest_surface?.depth_m ??
      selectedFloatProfile?.latest_surface?.depth;
    if (rawPres != null) {
      const p = Number(rawPres);
      return isNaN(p) ? "--" : p < 0 ? "0.0" : p.toFixed(1);
    }
    return "--";
  }, [selectedFloatProfile]);

  const latestCycle = useMemo(() => {
    if (selectedFloatProfile?.latest_surface?.cycle_number != null) {
      return selectedFloatProfile.latest_surface.cycle_number;
    }
    if (selectedFloatProfile?.cycle != null) {
      return selectedFloatProfile.cycle;
    }
    return targetFloat?.total_profiles || 100;
  }, [selectedFloatProfile, targetFloat]);

  const latestDateFormatted = useMemo(() => {
    const rawTime =
      selectedFloatProfile?.latest_surface?.time ||
      selectedFloatProfile?.measurements?.[0]?.time ||
      targetFloat?.last_seen;
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
    return "Aug 21, 2026";
  }, [selectedFloatProfile, targetFloat]);

  const latestTimeFormatted = useMemo(() => {
    const rawTime =
      selectedFloatProfile?.latest_surface?.time ||
      selectedFloatProfile?.measurements?.[0]?.time ||
      targetFloat?.last_seen;
    if (rawTime && String(rawTime).includes("T")) {
      return String(rawTime).split("T")[1]?.slice(0, 5) + " UTC";
    }
    return "09:56 UTC";
  }, [selectedFloatProfile, targetFloat]);

  // ── 2. Telemetry Calculations from Real Data (BIODIVERSITY MODE) ─────────
  const activeBio = useMemo(() => {
    if (selectedBioRecord) return selectedBioRecord;
    const match = biodiversity.find(
      (b) =>
        b.scientific_name.toLowerCase() === selectedSpecies.toLowerCase() ||
        b.common_name.toLowerCase() === selectedSpecies.toLowerCase()
    );
    return match || biodiversity[0] || null;
  }, [selectedBioRecord, selectedSpecies, biodiversity]);

  const bioScientificName = activeBio?.scientific_name || selectedSpecies || "Sardinella longiceps";
  const hasDistinctBioCommon = Boolean(
    activeBio?.common_name &&
    activeBio.common_name.trim().toLowerCase() !== bioScientificName.trim().toLowerCase()
  );
  const bioPrimaryTitle = hasDistinctBioCommon ? activeBio.common_name : bioScientificName;
  const bioLat = activeBio?.latitude != null ? Number(activeBio.latitude).toFixed(2) : "15.42";
  const bioLon = activeBio?.longitude != null ? Number(activeBio.longitude).toFixed(2) : "73.81";
  const bioTempMin = activeBio?.thermal_range_min_c != null ? Number(activeBio.thermal_range_min_c).toFixed(1) : "22.0";
  const bioTempMax = activeBio?.thermal_range_max_c != null ? Number(activeBio.thermal_range_max_c).toFixed(1) : "26.0";
  const bioSalMin = activeBio?.salinity_min_psu != null ? Number(activeBio.salinity_min_psu).toFixed(1) : "32.0";
  const bioSalMax = activeBio?.salinity_max_psu != null ? Number(activeBio.salinity_max_psu).toFixed(1) : "36.5";
  const bioHypoxia = activeBio?.hypoxia_avoidance_threshold_umol_kg != null ? Number(activeBio.hypoxia_avoidance_threshold_umol_kg).toFixed(0) : "45";
  const bioDepthStr = useMemo(() => {
    if (!activeBio) return "0–100 m";
    if (activeBio.depth_min_m != null && activeBio.depth_max_m != null) {
      return `${Number(activeBio.depth_min_m).toFixed(0)}–${Number(activeBio.depth_max_m).toFixed(0)} m`;
    }
    if (activeBio.depth_m != null) {
      return `${Number(activeBio.depth_m).toFixed(0)} m`;
    }
    return "0–100 m";
  }, [activeBio]);

  const isBioMode = selectedEntityType === "BIODIVERSITY";

  return (
    <div className="flex flex-col h-full space-y-3.5 overflow-y-auto custom-scrollbar select-none pr-1">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP 4 HERO KPI METRIC STRIP (DUAL-MODE: FLOAT ⇄ BIODIVERSITY)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: SELECTED ENTITY (FLOAT OR BIODIVERSITY) */}
        <div
          onClick={() => setActiveNav(isBioMode ? "BIODIVERSITY" : "FLOATS")}
          className={`p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] ${
            isBioMode
              ? "border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.15)]"
              : "border-sky-500/20 hover:border-cyan-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {isBioMode ? "Selected Species" : "Selected Float"}
            </span>
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold ${
                isBioMode ? "text-emerald-400" : "text-cyan-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBioMode
                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    : "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                }`}
              />
              <span>{isBioMode ? "CMLRE RECORD" : "TRANSMITTING"}</span>
            </div>
          </div>

          <div className="my-0.5 truncate">
            <div
              className="text-lg font-bold tracking-tight text-white font-mono truncate"
              title={isBioMode ? (hasDistinctBioCommon ? `${bioPrimaryTitle} (${bioScientificName})` : bioScientificName) : `ARGO #${floatWmo}`}
            >
              {isBioMode ? bioPrimaryTitle : `ARGO #${floatWmo}`}
            </div>
            {isBioMode && (
              <div className="text-[11px] font-mono text-emerald-400/90 italic truncate">
                {hasDistinctBioCommon ? bioScientificName : `Family: ${activeBio?.family || "Marine Taxa"}`}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wide ${
                isBioMode
                  ? "bg-emerald-500/15 border border-emerald-400/30 text-emerald-300"
                  : "bg-cyan-500/15 border border-cyan-400/30 text-cyan-300"
              }`}
            >
              {isBioMode ? `${bioLat}°N  ${bioLon}°E` : `${floatLat}°N  ${floatLon}°E`}
            </span>
            {isBioMode && (
              <span className="text-[10px] font-mono text-slate-400">
                Aphia #{activeBio?.aphia_id || "WoRMS"}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: SURFACE TEMP / PREFERRED TEMPERATURE ENVELOPE */}
        <div
          onClick={() => setActiveNav(isBioMode ? "BIODIVERSITY" : "FORECASTS")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-amber-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {isBioMode ? "Preferred Temp Range" : "Surface Temp"}
            </span>
            <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
              {isBioMode ? "Thermal Window" : surfaceAnomaly}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {isBioMode ? `${bioTempMin}–${bioTempMax}°C` : `${surfaceTemp}°C`}
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

        {/* KPI 3: SURFACE SALINITY / PREFERRED SALINITY & HYPOXIA FLOOR */}
        <div
          onClick={() => setActiveNav(isBioMode ? "BIODIVERSITY" : "OCEAN")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-cyan-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {isBioMode ? "Salinity Tolerance" : "Surface Salinity"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isBioMode ? `DOXY Floor: ≥ ${bioHypoxia} µmol/kg` : `DOXY ${surfaceDoxy} µmol/kg`}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {isBioMode ? `${bioSalMin}–${bioSalMax} PSU` : `${surfaceSal} PSU`}
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

        {/* KPI 4: SURFACE CAST DEPTH / DEPTH RANGE & HABITAT */}
        <div
          onClick={() => setActiveNav(isBioMode ? "BIODIVERSITY" : "FLOATS")}
          className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 hover:border-purple-400/50 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between shadow-lg h-[115px] relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {isBioMode ? "Depth Range" : "Surface Cast Depth"}
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-semibold capitalize">
              {isBioMode ? activeBio?.habitat_zone || "Pelagic" : `Cycle #${latestCycle}`}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {isBioMode ? bioDepthStr : `${latestSurfaceDepth} m`}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{isBioMode ? activeBio?.event_date || "2024-04-14" : latestDateFormatted}</span>
            <span>{isBioMode ? `Inst: ${activeBio?.institution_code || "CMLRE"}` : latestTimeFormatted}</span>
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
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 min-h-[630px]">
        {/* ── Central Interactive MapLibre Map (7 Cols) ────────────────────── */}
        <div className="xl:col-span-7 bg-[#040a14] border border-sky-500/20 rounded-xl overflow-hidden relative group shadow-2xl h-[630px]">
          <VarunaMap />
        </div>

        {/* ── Right Tactical Intelligence Column (5 Cols) ──────────────────── */}
        <div className="xl:col-span-5 flex flex-col gap-3 h-[630px]">
          {/* Top Half: Directory Selector with Floats ⇄ Biodiversity Switcher (225px) */}
          <div className="h-[225px] shrink-0">
            <FloatDirectoryPanel />
          </div>

          {/* Bottom Half: Deep Dive Mode (Float Probe) OR Species Taxonomic Profile (Flexible Auto Fill) */}
          <div className="flex-1 min-h-0">
            {isBioMode ? (
              <SpeciesTaxonomicProfilePanel
                onDeselect={() => setSelectedEntityType("FLOAT")}
              />
            ) : (
              <DeepDiveModePanel
                isCollapsible={true}
                onDeselect={() => setSelectedFloatId("")}
              />
            )}
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
                <div className="w-1/2 h-full bg-gradient-to-l from-cyan-400/40 to-transparent transform origin-right" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-sky-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Telemetry Pipeline</span>
            <span className="text-emerald-400 font-semibold">ALL SENSORS NOMINAL</span>
          </div>
        </div>
      </section>
    </div>
  );
}
