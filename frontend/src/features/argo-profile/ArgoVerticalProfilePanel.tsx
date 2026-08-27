"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Compass,
  X,
  ChevronRight,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import { getFloatTrajectory } from "@/lib/api/argo";
import type { FloatTrajectoryPoint } from "@/types/argo";

export function ArgoVerticalProfilePanel({
  isCollapsible = false,
  onDeselect,
}: {
  isCollapsible?: boolean;
  onDeselect?: () => void;
} = {}) {
  const { selectedFloatId, selectedFloatProfile, floats, setActiveNav } = useOperationalState();
  const [activeView, setActiveView] = useState<"Profile" | "Map" | "History">("Profile");
  const [trajectoryPoints, setTrajectoryPoints] = useState<FloatTrajectoryPoint[]>([]);

  // Find active float summary
  const activeFloat = useMemo(() => {
    return floats.find((f) => String(f.wmo_id) === selectedFloatId) || floats[0] || null;
  }, [floats, selectedFloatId]);

  // Load float trajectory when selectedFloatId changes
  useEffect(() => {
    if (!selectedFloatId) return;
    getFloatTrajectory(selectedFloatId, 365)
      .then((res) => {
        if (res && res.points) {
          setTrajectoryPoints(res.points);
        }
      })
      .catch(() => setTrajectoryPoints([]));
  }, [selectedFloatId]);

  // Extract measurements
  const measurements = useMemo(() => {
    if (!selectedFloatProfile || !selectedFloatProfile.measurements || selectedFloatProfile.measurements.length === 0) {
      // Fallback hydrostatic baseline profile if DB record is empty
      return [
        { depth: 5, temp: 29.4, psal: 35.8, doxy: 198.3, chla: 0.38, nitrate: 1.2 },
        { depth: 25, temp: 29.1, psal: 35.8, doxy: 195.0, chla: 0.65, nitrate: 1.8 },
        { depth: 50, temp: 28.2, psal: 36.1, doxy: 172.4, chla: 0.42, nitrate: 3.5 },
        { depth: 100, temp: 24.5, psal: 36.3, doxy: 85.1, chla: 0.12, nitrate: 8.9 },
        { depth: 150, temp: 20.8, psal: 35.9, doxy: 42.6, chla: 0.04, nitrate: 16.2 },
        { depth: 250, temp: 16.2, psal: 35.4, doxy: 38.2, chla: 0.01, nitrate: 24.5 },
        { depth: 500, temp: 11.4, psal: 35.1, doxy: 55.4, chla: 0.0, nitrate: 32.1 },
        { depth: 1000, temp: 7.2, psal: 34.9, doxy: 98.2, chla: 0.0, nitrate: 36.4 },
        { depth: 1500, temp: 5.1, psal: 34.8, doxy: 135.6, chla: 0.0, nitrate: 38.2 },
        { depth: 2000, temp: 3.8, psal: 34.7, doxy: 158.0, chla: 0.0, nitrate: 39.0 },
      ];
    }
    return selectedFloatProfile.measurements;
  }, [selectedFloatProfile]);

  // Key Surface Metrics (0–50m)
  const surfaceMetrics = useMemo(() => {
    const surface = measurements[0] || {};
    return {
      sst: surface.temp != null ? `${surface.temp.toFixed(1)} °C` : "28.4 °C",
      psal: surface.psal != null ? `${surface.psal.toFixed(1)} PSU` : "35.2 PSU",
      doxy: surface.doxy != null ? `${surface.doxy.toFixed(1)} µmol/kg` : "185.3 µmol/kg",
      chla: surface.chla != null ? `${surface.chla.toFixed(2)} mg/m³` : "0.38 mg/m³",
      nitrate: surface.nitrate != null ? `${surface.nitrate.toFixed(1)} µmol/kg` : "4.2 µmol/kg",
    };
  }, [measurements]);

  // Generate SVG Path for Depth Curves
  const generateCurvePath = React.useCallback(
    (key: "temp" | "psal" | "doxy" | "chla", valMin: number, valMax: number) => {
      const width = 190;
      const height = 125;
      const valid = measurements.filter((m: any) => m[key] != null && m.depth != null);
      if (valid.length === 0) return "";

      const maxDepth = 2000;

      const points = valid.map((m: any) => {
        const val = m[key];
        const depth = Math.abs(m.depth);
        const x = 5 + ((val - valMin) / (valMax - valMin)) * (width - 10);
        const y = 3 + (depth / maxDepth) * (height - 6);
        return `${Math.max(5, Math.min(width, x)).toFixed(1)},${Math.max(3, Math.min(height, y)).toFixed(1)}`;
      });

      return `M ${points.join(" L ")}`;
    },
    [measurements]
  );

  const tempPath = useMemo(() => generateCurvePath("temp", 0, 35), [generateCurvePath]);
  const psalPath = useMemo(() => generateCurvePath("psal", 33, 37), [generateCurvePath]);
  const doxyPath = useMemo(() => generateCurvePath("doxy", 0, 250), [generateCurvePath]);
  const chlaPath = useMemo(() => generateCurvePath("chla", 0, 1.5), [generateCurvePath]);

  // Mini Trajectory SVG Path
  const trajectoryPath = useMemo(() => {
    if (trajectoryPoints.length < 2) return "M 15 30 Q 35 15, 60 22 T 85 10";
    const lats = trajectoryPoints.map((p) => p.latitude);
    const lons = trajectoryPoints.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats) || minLat + 1;
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons) || minLon + 1;

    const pts = trajectoryPoints.slice(-15).map((p) => {
      const x = 10 + ((p.longitude - minLon) / (maxLon - minLon)) * 80;
      const y = 35 - ((p.latitude - minLat) / (maxLat - minLat)) * 28;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return `M ${pts.join(" L ")}`;
  }, [trajectoryPoints]);

  // Collapsed state when no float is selected
  if (isCollapsible && !selectedFloatId) {
    return (
      <div className="panel-marine px-4 py-3 bg-[#0B1D2C]/90 flex items-center justify-between gap-4 font-mono text-[13px] select-none transition-all shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center shadow-[0_0_10px_rgba(46,230,198,0.25)] shrink-0">
            <Radio size={16} className="text-[#00FFC6]" />
          </div>
          <div className="flex items-center gap-2.5 truncate">
            <span className="font-bold text-white uppercase text-[13px]">
              Vertical Cast Profile
            </span>
            <span className="text-[#809AAB] text-[13px] truncate">
              Select a float on the map to view its profile
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveNav("FLOATS")}
            className="px-3.5 py-1.5 rounded-lg bg-[#2EE6C6]/15 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Float Studio</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none">
      {/* ── Header & Action Controls ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Radio size={12} className="text-[#00FFC6]" />
          </div>
          <span className="text-xs sm:text-[13px] font-mono font-bold tracking-wider text-white">
            ARGO #{selectedFloatId || "2902764"} · Vertical Cast Profile
          </span>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1.5">
          {(["Profile", "Map", "History"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-2.5 py-0.5 rounded text-xs font-mono transition-all ${
                activeView === view
                  ? "bg-[#2EE6C6] text-black font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {view}
            </button>
          ))}
          {isCollapsible && onDeselect && (
            <button
              onClick={onDeselect}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all ml-1 cursor-pointer"
              title="Deselect float"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Subtitle Info Strip ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs font-mono text-[#809AAB] pb-1.5 shrink-0">
        <span>Depth: <b className="text-white font-normal">0 – 2000 m (CTD/BGC)</b></span>
        <span>
          Location:{" "}
          <b className="text-white font-normal">
            {activeFloat ? `${activeFloat.last_lat.toFixed(2)}°N, ${activeFloat.last_lon.toFixed(2)}°E` : "2.82°N, 76.72°E"}
          </b>
        </span>
      </div>

      {/* ── Main Multi-Parameter Depth Profile Visualizer ──────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-[220px]">
        {/* Left 4-Curve Scientific SVG Depth Chart */}
        <div className="col-span-8 bg-[#0E2435] rounded-lg border border-white/5 p-2.5 flex flex-col justify-between relative overflow-hidden">
          {/* Curve Legends Header */}
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300 pb-1.5 border-b border-white/5">
            <span className="flex items-center gap-1 text-[#FF4B4B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4B4B]" /> Temp (°C)
            </span>
            <span className="flex items-center gap-1 text-[#38BDF8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" /> Salinity (PSU)
            </span>
            <span className="flex items-center gap-1 text-[#00FFC6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]" /> DOXY (µmol)
            </span>
            <span className="flex items-center gap-1 text-[#FACC15]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" /> Chl-a
            </span>
          </div>

          {/* 4 Multi-Parameter Hydrostatic Curves SVG */}
          <div className="flex-1 w-full h-full relative flex items-center">
            {/* Depth Axis Labels on Left */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono text-zinc-500 pointer-events-none py-1">
              <span>0m</span>
              <span>500m</span>
              <span>1000m</span>
              <span>1500m</span>
              <span>2000m</span>
            </div>

            {/* Depth Grid & Multi-curves */}
            <svg className="w-full h-full pl-8 pr-1" viewBox="0 0 200 130" fill="none">
              {/* Horizontal depth gridlines */}
              <line x1="0" y1="0" x2="200" y2="0" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <line x1="0" y1="32" x2="200" y2="32" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="65" x2="200" y2="65" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="98" x2="200" y2="98" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="130" x2="200" y2="130" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

              {/* 1. Temperature Curve (Red) */}
              {tempPath && (
                <path
                  d={tempPath}
                  stroke="#FF4B4B"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 2. Salinity Curve (Blue) */}
              {psalPath && (
                <path
                  d={psalPath}
                  stroke="#38BDF8"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 3. Dissolved Oxygen (Cyan) */}
              {doxyPath && (
                <path
                  d={doxyPath}
                  stroke="#00FFC6"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 4. Chlorophyll-a (Yellow) */}
              {chlaPath && (
                <path
                  d={chlaPath}
                  stroke="#FACC15"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>

          {/* Bottom Scale Markers */}
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5 pl-8">
            <span className="text-[#FF4B4B]">0°</span>
            <span className="text-[#FF4B4B]">35°C</span>
            <span className="text-[#38BDF8]">33</span>
            <span className="text-[#38BDF8]">37 PSU</span>
            <span className="text-[#00FFC6]">0</span>
            <span className="text-[#00FFC6]">250 µmol</span>
          </div>
        </div>

        {/* Right Inset: Mini Trajectory Map + Key Metrics */}
        <div className="col-span-4 flex flex-col justify-between space-y-2">
          {/* Mini Trajectory Inset */}
          <div className="h-20 rounded-lg bg-[#0E2435] border border-white/5 p-2 relative overflow-hidden flex flex-col justify-between">
            <div className="text-xs font-mono text-[#809AAB] flex items-center justify-between">
              <span>90-Day Trajectory</span>
              <Compass size={12} className="text-[#2EE6C6]" />
            </div>

            {/* Drift Path Visual */}
            <svg className="w-full h-10" viewBox="0 0 100 40" fill="none">
              <path
                d={trajectoryPath}
                stroke="#00FFC6"
                strokeWidth="1.6"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <circle cx="85" cy="10" r="3" fill="#00FFC6" className="animate-ping" />
              <circle cx="85" cy="10" r="2" fill="#00FFC6" />
            </svg>
          </div>

          {/* Key Metrics (0-50m) Table */}
          <div className="p-2.5 rounded-lg bg-[#0E2435] border border-white/5 text-xs font-mono space-y-1.5">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Live In-Situ Metrics
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">SST</span>
              <span className="text-[#FF4B4B] font-bold">{surfaceMetrics.sst}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Salinity</span>
              <span className="text-[#38BDF8] font-bold">{surfaceMetrics.psal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">DOXY</span>
              <span className="text-[#00FFC6] font-bold">{surfaceMetrics.doxy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Chl-a</span>
              <span className="text-[#FACC15] font-bold">{surfaceMetrics.chla}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Nitrate</span>
              <span className="text-white font-bold">{surfaceMetrics.nitrate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
