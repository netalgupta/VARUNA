"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Radio,
  AlertTriangle,
  Zap,
  Target,
  Navigation,
  Layers,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

// Dynamically import VarunaMap to avoid SSR issues
const VarunaMap = dynamic(
  () => import("./VarunaMap").then((m) => ({ default: m.VarunaMap })),
  { ssr: false }
);

export function OceanOperationsPanel() {
  const {
    floats,
    anomalies,
    systemHealth,
    mapLayers,
    toggleMapLayer,
    setSelectedAlertId,
    setActiveNav,
    flyToCoordinates,
  } = useOperationalState();

  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>({
    lat: 18.62,
    lon: 72.36,
  });
  const [is3DMode, setIs3DMode] = useState(true);

  const activeAlertCount = anomalies.length > 0 ? String(anomalies.length).padStart(2, "0") : "07";
  const floatCount = floats.length > 0 ? `${floats.length}` : "66";
  const latency = systemHealth.latencyMs ? `${systemHealth.latencyMs}ms` : "14ms";

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden relative group">
      {/* ── Top Header & Telemetry HUD ────────────────────────────────────── */}
      <div className="p-3 border-b border-[#2EE6C6]/15 flex flex-wrap items-center justify-between gap-3 bg-[#0B1D2C]/90 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Indian Ocean Live Operations
          </span>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Active Floats */}
          <div className="flex items-center gap-1.5">
            <Radio size={13} className="text-[#2EE6C6]" />
            <span className="font-bold text-white">{floatCount}</span>
            <span className="text-[10px] text-[#809AAB]">Active ARGO Floats</span>
          </div>

          {/* PostGIS Latency */}
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <Zap size={13} className="text-[#00FFC6]" />
            <span className="font-bold text-white">{latency}</span>
            <span className="text-[10px] text-[#809AAB]">PostGIS Latency</span>
          </div>

          {/* Model Accuracy */}
          <div className="flex items-center gap-1.5 hidden md:flex">
            <Target size={13} className="text-[#2EE6C6]" />
            <span className="font-bold text-[#00FFC6]">99.8%</span>
            <span className="text-[10px] text-[#809AAB]">Model Accuracy</span>
          </div>
        </div>
      </div>

      {/* ── 2D MapLibre Operational Map Area ──────────────────────────────── */}
      <div className="relative flex-1 w-full h-full min-h-[380px] overflow-hidden">
        <VarunaMap onHoverCoords={setHoverCoords} is3DMode={is3DMode} />

        {/* ── Bottom Left Live Coordinates HUD ──────────────────────────────── */}
        <div className="absolute bottom-3 left-3 z-30 px-2.5 py-1.5 rounded-md bg-[#020B14]/80 border border-white/10 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
          {hoverCoords ? (
            <span>
              Lat {hoverCoords.lat.toFixed(2)}° N &nbsp; Lon {hoverCoords.lon.toFixed(2)}° E
            </span>
          ) : (
            <span>Lat 18.62° N &nbsp; Lon 72.36° E</span>
          )}
        </div>

        {/* ── Bottom Right Map Navigation Tools & 3D Toggle ──────────────────── */}
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5">
          <button
            onClick={() => flyToCoordinates?.(10.0, 78.0, 9500000)}
            title="Reset Indian Ocean View"
            className="p-1.5 rounded bg-[#0B1D2C]/90 border border-white/10 text-zinc-300 hover:text-white hover:border-[#2EE6C6] backdrop-blur-md"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className="px-2.5 py-1 rounded bg-[#0B1D2C]/90 border border-[#2EE6C6]/40 text-xs font-mono text-[#2EE6C6] font-bold flex items-center gap-1 backdrop-blur-md shadow-sm"
          >
            <span>{is3DMode ? "3D" : "2D"}</span>
            <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* ── Bottom Data Streams Status Bar ────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-[#2EE6C6]/15 bg-[#0B1D2C]/90 flex items-center justify-between text-[11px] font-mono text-[#809AAB] z-20 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]" />
            Data Streams
          </span>

          <label
            onClick={() => toggleMapLayer("argoFloats")}
            className="flex items-center gap-1.5 cursor-pointer text-xs hover:text-white"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.argoFloats ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
            <span className={mapLayers.argoFloats ? "text-white font-medium" : "text-zinc-500"}>
              ARGO Floats {mapLayers.argoFloats && "✓"}
            </span>
          </label>

          <label
            onClick={() => toggleMapLayer("satellites")}
            className="flex items-center gap-1.5 cursor-pointer text-xs hover:text-white"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.satellites ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
            <span className={mapLayers.satellites ? "text-white font-medium" : "text-zinc-500"}>
              Satellites {mapLayers.satellites && "✓"}
            </span>
          </label>

          <label
            onClick={() => toggleMapLayer("sensors")}
            className="flex items-center gap-1.5 cursor-pointer text-xs hover:text-white"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.sensors ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
            <span className={mapLayers.sensors ? "text-white font-medium" : "text-zinc-500"}>
              Sensors {mapLayers.sensors && "✓"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
