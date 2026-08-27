"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Globe2,
  Layers,
  MapPin,
  Compass,
  Radio,
  Fish,
  Flame,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import { BASIN_PRESETS } from "@/config/map";

const VarunaMap = dynamic(
  () => import("@/features/ocean-map/VarunaMap").then((m) => ({ default: m.VarunaMap })),
  { ssr: false }
);

export function OceanView() {
  const {
    floats,
    biodiversity,
    anomalies,
    mapLayers,
    toggleMapLayer,
    selectedFloatId,
    setSelectedFloatId,
    selectedSpecies,
    selectedAlertId,
    activeAnomaly,
    flyToCoordinates,
    setActiveNav,
  } = useOperationalState();

  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>({
    lat: 18.62,
    lon: 72.36,
  });
  const [is3DMode, setIs3DMode] = useState(true);

  const selectedFloat = floats.find((f) => String(f.wmo_id) === selectedFloatId) || floats[0];

  return (
    <div className="flex flex-col h-full space-y-2 p-1 overflow-hidden select-none">
      {/* ── Top Basin Camera Presets ──────────────────────────────────────── */}
      <div className="p-2 panel-marine flex items-center justify-between bg-[#0B1D2C]/90 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <Globe2 size={14} className="text-[#00FFC6]" />
          <span className="font-bold text-white uppercase">Geospatial Operations Center</span>
        </div>

        {/* Basin Camera Jump Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase mr-1">Basin Focus:</span>
          <button
            onClick={() => flyToCoordinates?.(BASIN_PRESETS.INDIAN_OCEAN.lat, BASIN_PRESETS.INDIAN_OCEAN.lon, BASIN_PRESETS.INDIAN_OCEAN.zoom)}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2EE6C6]/20 text-zinc-300 hover:text-white border border-white/10"
          >
            Indian Ocean
          </button>
          <button
            onClick={() => flyToCoordinates?.(BASIN_PRESETS.ARABIAN_SEA.lat, BASIN_PRESETS.ARABIAN_SEA.lon, BASIN_PRESETS.ARABIAN_SEA.zoom)}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2EE6C6]/20 text-zinc-300 hover:text-white border border-white/10"
          >
            Arabian Sea
          </button>
          <button
            onClick={() => flyToCoordinates?.(BASIN_PRESETS.BAY_OF_BENGAL.lat, BASIN_PRESETS.BAY_OF_BENGAL.lon, BASIN_PRESETS.BAY_OF_BENGAL.zoom)}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2EE6C6]/20 text-zinc-300 hover:text-white border border-white/10"
          >
            Bay of Bengal
          </button>
          <button
            onClick={() => flyToCoordinates?.(BASIN_PRESETS.GULF_OF_MANNAR.lat, BASIN_PRESETS.GULF_OF_MANNAR.lon, BASIN_PRESETS.GULF_OF_MANNAR.zoom)}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2EE6C6]/20 text-zinc-300 hover:text-white border border-white/10"
          >
            Gulf of Mannar
          </button>
        </div>
      </div>

      {/* ── Main Geospatial Workspace (3 Columns) ─────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* Left Layer Controls (2.5 Cols) */}
        <div className="col-span-12 lg:col-span-3 panel-marine p-3 bg-[#0B1D2C]/90 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Layers size={13} className="text-[#2EE6C6]" />
              <span>Map Layers</span>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-1.5 font-mono text-xs">
              <label
                onClick={() => toggleMapLayer("argoFloats")}
                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  mapLayers.argoFloats
                    ? "bg-[#2EE6C6]/10 border-[#2EE6C6]/40 text-white"
                    : "bg-[#0E2435] border-white/5 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio size={13} className={mapLayers.argoFloats ? "text-[#2EE6C6]" : "text-zinc-500"} />
                  <span>ARGO Float Fleet</span>
                </div>
                <span className="text-[10px] font-bold">{floats.length || 3842}</span>
              </label>

              <label
                onClick={() => toggleMapLayer("biodiversity")}
                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  mapLayers.biodiversity
                    ? "bg-[#00FFC6]/10 border-[#00FFC6]/40 text-white"
                    : "bg-[#0E2435] border-white/5 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Fish size={13} className={mapLayers.biodiversity ? "text-[#00FFC6]" : "text-zinc-500"} />
                  <span>CMLRE Living Resources</span>
                </div>
                <span className="text-[10px] font-bold">{biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"}</span>
              </label>

              <label
                onClick={() => toggleMapLayer("heatwaves")}
                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  mapLayers.heatwaves
                    ? "bg-red-950/40 border-red-500/40 text-white"
                    : "bg-[#0E2435] border-white/5 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame size={13} className={mapLayers.heatwaves ? "text-[#FF4B4B]" : "text-zinc-500"} />
                  <span>Marine Heatwaves (P90)</span>
                </div>
                <span className="text-[10px] text-red-400 font-bold">ACTIVE</span>
              </label>

              <label
                onClick={() => toggleMapLayer("hypoxia")}
                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  mapLayers.hypoxia
                    ? "bg-amber-950/40 border-amber-500/40 text-white"
                    : "bg-[#0E2435] border-white/5 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className={mapLayers.hypoxia ? "text-[#F59E0B]" : "text-zinc-500"} />
                  <span>Hypoxia Zones (OMZ)</span>
                </div>
                <span className="text-[10px] text-[#F59E0B] font-bold">&lt;60 µmol</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 space-y-1 text-[10px] font-mono text-zinc-400">
            <div className="flex justify-between">
              <span>Mapping Engine</span>
              <span className="text-[#2EE6C6] font-bold">MapLibre GL 2D</span>
            </div>
            <div className="flex justify-between">
              <span>Spatial Index</span>
              <span className="text-white">PostGIS GIST</span>
            </div>
          </div>
        </div>

        {/* Center Dominant MapLibre 2D Map (6.5 Cols) */}
        <div className="col-span-12 lg:col-span-6 panel-marine relative overflow-hidden flex flex-col min-h-[420px]">
          <VarunaMap onHoverCoords={setHoverCoords} is3DMode={is3DMode} />
        </div>

        {/* Right Selected Entity Telemetry (2.5 Cols) */}
        <div className="col-span-12 lg:col-span-3 panel-marine p-3 bg-[#0B1D2C]/90 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="space-y-3 font-mono text-xs">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Radio size={13} className="text-[#2EE6C6]" />
              <span>Selected Object</span>
            </div>

            {/* Selected Float Card */}
            {selectedFloat && (
              <div className="p-2.5 rounded-lg bg-[#0E2435] border border-[#2EE6C6]/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">ARGO #{selectedFloat.wmo_id}</span>
                  <span className="text-[9px] text-[#00FFC6] font-bold">ACTIVE</span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Pos: {selectedFloat.last_lat.toFixed(2)}°N, {selectedFloat.last_lon.toFixed(2)}°E
                </div>
                <div className="text-[10px] text-zinc-400">
                  Last Seen: {selectedFloat.last_seen ? selectedFloat.last_seen.substring(0, 10) : "2026-08-14"}
                </div>
                <div className="pt-1.5 border-t border-white/5 flex justify-between text-[10px]">
                  <span>Profiles Cast:</span>
                  <span className="text-[#2EE6C6] font-bold">{selectedFloat.total_profiles || 280}</span>
                </div>
                <button
                  onClick={() => setActiveNav("FLOATS")}
                  className="w-full h-6 rounded bg-[#2EE6C6]/20 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black font-bold text-[9px] flex items-center justify-center gap-1 transition-all mt-1"
                >
                  <span>Open Full Cast Profile</span>
                  <ChevronRight size={10} />
                </button>
              </div>
            )}

            {/* Active Anomaly Snapshot */}
            {activeAnomaly && (
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-red-400 font-bold">
                  <span>{activeAnomaly.alert_type}</span>
                  <span>+{activeAnomaly.anomaly_value}°C</span>
                </div>
                <div className="text-[10px] text-white font-bold">
                  {activeAnomaly.ocean_basin.toUpperCase().replace("_", " ")}
                </div>
                <button
                  onClick={() => setActiveNav("ALERTS")}
                  className="w-full h-6 rounded bg-[#FF4B4B]/20 hover:bg-[#FF4B4B] text-white font-bold text-[9px] flex items-center justify-center gap-1 transition-all mt-1"
                >
                  <span>Inspect Alert Dossier</span>
                  <ChevronRight size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
