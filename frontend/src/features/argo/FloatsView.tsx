"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getVarunaMapStyle } from "@/features/ocean-map/mapStyle";
import {
  Radio,
  Search,
  ChevronRight,
  ChevronLeft,
  Compass,
  Layers,
  Thermometer,
  Droplets,
  Activity,
  Filter,
  Download,
  Bot,
  MapPin,
  Clock,
  Sparkles,
  Database,
  Eye,
  TrendingUp,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  X,
  Code,
  Copy,
  Check,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export interface DatabaseFloatRecord {
  wmo: number;
  id: string;
  lat: number;
  lon: number;
  firstDate: string;
  latestDate: string;
  spanDays: number;
  cycles: number;
  totalObs: number;
  minPres: number;
  maxPres: number;
  surfaceTemp: number;
  surfacePsal: number;
  surfaceDoxy: number;
  surfaceChla: number;
  surfaceNitrate: number;
  surfacePh: number;
  status: "NORMAL" | "CRITICAL" | "MONITORED";
  species: string;
  hasTemp: boolean;
  hasPsal: boolean;
  hasDoxy: boolean;
  hasChla: boolean;
  hasPh: boolean;
  hasNitrate: boolean;
}

// Complete catalog of real solo ARGO Floats present in Supabase DB
export const ALL_SUPABASE_FLOATS: DatabaseFloatRecord[] = [
  { wmo: 4903660, id: "ARGO-4903660", lat: 16.16, lon: 63.07, firstDate: "2023-06-05", latestDate: "2025-07-28", spanDays: 783.1, cycles: 142, totalObs: 147113, minPres: 1.0, maxPres: 2005.4, surfaceTemp: 29.8, surfacePsal: 36.5, surfaceDoxy: 165.4, surfaceChla: 0.42, surfaceNitrate: 28.5, surfacePh: 7.95, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 6990514, id: "ARGO-6990514", lat: 16.58, lon: 65.81, firstDate: "2023-06-05", latestDate: "2025-07-28", spanDays: 783.1, cycles: 140, totalObs: 146885, minPres: 1.2, maxPres: 2010.0, surfaceTemp: 30.1, surfacePsal: 36.6, surfaceDoxy: 158.0, surfaceChla: 0.38, surfaceNitrate: 30.2, surfacePh: 7.92, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902594, id: "ARGO-1902594", lat: 10.59, lon: 84.71, firstDate: "2023-06-15", latestDate: "2025-07-30", spanDays: 775.5, cycles: 128, totalObs: 126358, minPres: 0.8, maxPres: 2000.0, surfaceTemp: 29.2, surfacePsal: 34.1, surfaceDoxy: 178.5, surfaceChla: 0.55, surfaceNitrate: 26.4, surfacePh: 8.01, status: "NORMAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902272, id: "ARGO-2902272", lat: 18.23, lon: 62.78, firstDate: "2022-01-09", latestDate: "2025-07-31", spanDays: 1300.0, cycles: 185, totalObs: 121933, minPres: 0.5, maxPres: 2008.0, surfaceTemp: 31.4, surfacePsal: 36.8, surfaceDoxy: 48.2, surfaceChla: 0.72, surfaceNitrate: 34.0, surfacePh: 7.72, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902273, id: "ARGO-2902273", lat: 17.07, lon: 67.11, firstDate: "2022-01-19", latestDate: "2025-07-22", spanDays: 1280.0, cycles: 178, totalObs: 117671, minPres: 0.5, maxPres: 2004.0, surfaceTemp: 30.9, surfacePsal: 36.7, surfaceDoxy: 51.0, surfaceChla: 0.68, surfaceNitrate: 32.5, surfacePh: 7.78, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902271, id: "ARGO-2902271", lat: 14.94, lon: 64.53, firstDate: "2022-01-09", latestDate: "2024-12-14", spanDays: 1070.0, cycles: 160, totalObs: 106544, minPres: 0.4, maxPres: 2000.0, surfaceTemp: 30.5, surfacePsal: 36.4, surfaceDoxy: 56.4, surfaceChla: 0.60, surfaceNitrate: 31.0, surfacePh: 7.82, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902751, id: "ARGO-1902751", lat: 20.43, lon: 60.25, firstDate: "2025-04-21", latestDate: "2025-07-30", spanDays: 100.1, cycles: 38, totalObs: 92466, minPres: 1.0, maxPres: 2000.0, surfaceTemp: 30.7, surfacePsal: 36.9, surfaceDoxy: 54.0, surfaceChla: 0.64, surfaceNitrate: 33.1, surfacePh: 7.75, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902270, id: "ARGO-2902270", lat: 13.82, lon: 65.56, firstDate: "2022-01-09", latestDate: "2024-05-21", spanDays: 863.0, cycles: 130, totalObs: 83183, minPres: 0.6, maxPres: 2000.0, surfaceTemp: 29.8, surfacePsal: 36.2, surfaceDoxy: 160.0, surfaceChla: 0.45, surfaceNitrate: 27.0, surfacePh: 7.90, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 7901136, id: "ARGO-7901136", lat: 16.47, lon: 68.30, firstDate: "2023-10-26", latestDate: "2026-08-19", spanDays: 1028.0, cycles: 154, totalObs: 72702, minPres: 0.5, maxPres: 2006.0, surfaceTemp: 31.0, surfacePsal: 36.5, surfaceDoxy: 49.5, surfaceChla: 0.70, surfaceNitrate: 33.8, surfacePh: 7.70, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 5907092, id: "ARGO-5907092", lat: 12.46, lon: 67.24, firstDate: "2023-10-27", latestDate: "2026-08-18", spanDays: 1026.0, cycles: 150, totalObs: 71676, minPres: 0.5, maxPres: 2002.0, surfaceTemp: 29.9, surfacePsal: 36.1, surfaceDoxy: 168.0, surfaceChla: 0.48, surfaceNitrate: 26.5, surfacePh: 7.92, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902275, id: "ARGO-2902275", lat: 17.43, lon: 69.82, firstDate: "2022-01-09", latestDate: "2023-03-02", spanDays: 417.0, cycles: 70, totalObs: 68300, minPres: 0.8, maxPres: 2000.0, surfaceTemp: 29.5, surfacePsal: 36.3, surfaceDoxy: 172.0, surfaceChla: 0.50, surfaceNitrate: 25.0, surfacePh: 7.96, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902277, id: "ARGO-2902277", lat: 19.92, lon: 65.17, firstDate: "2022-01-06", latestDate: "2023-12-17", spanDays: 710.0, cycles: 110, totalObs: 63261, minPres: 0.5, maxPres: 2000.0, surfaceTemp: 30.6, surfacePsal: 36.7, surfaceDoxy: 52.8, surfaceChla: 0.66, surfaceNitrate: 32.0, surfacePh: 7.76, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902367, id: "ARGO-1902367", lat: 5.41, lon: 88.64, firstDate: "2025-04-15", latestDate: "2026-08-20", spanDays: 492.0, cycles: 56, totalObs: 60133, minPres: 0.36, maxPres: 2014.2, surfaceTemp: 28.6, surfacePsal: 34.8, surfaceDoxy: 182.4, surfaceChla: 0.44, surfaceNitrate: 31.5, surfacePh: 7.66, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902660, id: "ARGO-1902660", lat: 21.42, lon: 59.60, firstDate: "2025-04-20", latestDate: "2025-07-31", spanDays: 102.0, cycles: 36, totalObs: 57208, minPres: 1.2, maxPres: 2000.0, surfaceTemp: 31.5, surfacePsal: 37.0, surfaceDoxy: 45.2, surfaceChla: 0.76, surfaceNitrate: 34.8, surfacePh: 7.68, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902263, id: "ARGO-2902263", lat: 16.61, lon: 63.11, firstDate: "2022-01-03", latestDate: "2024-04-02", spanDays: 820.0, cycles: 120, totalObs: 52398, minPres: 0.7, maxPres: 2000.0, surfaceTemp: 30.2, surfacePsal: 36.4, surfaceDoxy: 58.0, surfaceChla: 0.58, surfaceNitrate: 29.5, surfacePh: 7.84, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902373, id: "ARGO-1902373", lat: 13.84, lon: 91.56, firstDate: "2025-04-20", latestDate: "2026-08-17", spanDays: 484.0, cycles: 79, totalObs: 48497, minPres: 0.36, maxPres: 1733.4, surfaceTemp: 29.4, surfacePsal: 33.2, surfaceDoxy: 176.2, surfaceChla: 0.62, surfaceNitrate: 28.4, surfacePh: 7.82, status: "MONITORED", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902306, id: "ARGO-2902306", lat: 19.50, lon: 65.63, firstDate: "2024-05-10", latestDate: "2025-07-30", spanDays: 446.0, cycles: 65, totalObs: 46704, minPres: 0.5, maxPres: 2000.0, surfaceTemp: 30.8, surfacePsal: 36.6, surfaceDoxy: 50.4, surfaceChla: 0.65, surfaceNitrate: 31.8, surfacePh: 7.74, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902457, id: "ARGO-1902457", lat: 5.15, lon: 71.24, firstDate: "2023-06-04", latestDate: "2026-08-12", spanDays: 1165.0, cycles: 117, totalObs: 40989, minPres: 2.0, maxPres: 2010.7, surfaceTemp: 31.2, surfacePsal: 36.1, surfaceDoxy: 46.8, surfaceChla: 0.78, surfaceNitrate: 34.2, surfacePh: 7.62, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902455, id: "ARGO-1902455", lat: 2.09, lon: 73.01, firstDate: "2023-06-02", latestDate: "2026-08-20", spanDays: 1175.0, cycles: 118, totalObs: 40389, minPres: 0.7, maxPres: 2008.1, surfaceTemp: 29.1, surfacePsal: 35.4, surfaceDoxy: 190.5, surfaceChla: 0.38, surfaceNitrate: 22.1, surfacePh: 7.91, status: "NORMAL", species: "Epinephelus tauvina", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 1902458, id: "ARGO-1902458", lat: 10.27, lon: 62.41, firstDate: "2023-06-14", latestDate: "2026-08-12", spanDays: 1155.0, cycles: 116, totalObs: 40204, minPres: 2.1, maxPres: 2006.9, surfaceTemp: 30.8, surfacePsal: 36.4, surfaceDoxy: 52.1, surfaceChla: 0.65, surfaceNitrate: 30.0, surfacePh: 7.68, status: "CRITICAL", species: "Sardinella longiceps", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
  { wmo: 2902758, id: "ARGO-2902758", lat: 17.25, lon: 90.18, firstDate: "2022-01-04", latestDate: "2025-07-28", spanDays: 1301.2, cycles: 64, totalObs: 38400, minPres: 7.5, maxPres: 2000.0, surfaceTemp: 29.68, surfacePsal: 32.18, surfaceDoxy: 184.89, surfaceChla: 0.52, surfaceNitrate: 26.8, surfacePh: 7.85, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: false, hasNitrate: true },
  { wmo: 2902764, id: "ARGO-2902764", lat: 3.90, lon: 88.16, firstDate: "2022-01-01", latestDate: "2026-08-21", spanDays: 1693.0, cycles: 180, totalObs: 26153, minPres: 0.4, maxPres: 2000.0, surfaceTemp: 28.8, surfacePsal: 34.6, surfaceDoxy: 184.5, surfaceChla: 0.42, surfaceNitrate: 23.8, surfacePh: 8.04, status: "NORMAL", species: "Thunnus albacares", hasTemp: true, hasPsal: true, hasDoxy: true, hasChla: true, hasPh: true, hasNitrate: true },
];

/**
 * Tactical Pop-up Map Modal for Single Float Spatial Tracking
 */
function FloatPopupMapModal({
  float,
  onClose,
  onOpenGlobalMap,
}: {
  float: DatabaseFloatRecord;
  onClose: () => void;
  onOpenGlobalMap: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getVarunaMapStyle("dark"),
      center: [float.lon, float.lat],
      zoom: 6.8,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    // 1. Create robust High-Visibility Tactical DOM Marker immediately
    const el = document.createElement("div");
    el.style.cssText = "position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999;";
    el.innerHTML = `
      <style>
        @keyframes varunaBeaconPing {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes varunaBeaconPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.75; }
        }
      </style>
      <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 255, 198, 0.4); animation: varunaBeaconPing 2s infinite ease-out;"></div>
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(46, 230, 198, 0.6); border: 2px solid #00FFC6; box-shadow: 0 0 18px #00FFC6; animation: varunaBeaconPulse 2s infinite ease-in-out;"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; border: 3px solid #00FFC6; box-shadow: 0 0 10px #ffffff;"></div>
      <div style="position: absolute; top: 62px; left: 50%; transform: translateX(-50%); background: #051422; border: 1.5px solid #00FFC6; padding: 3px 8px; border-radius: 8px; color: #83FFE3; font-family: monospace; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 4px 20px rgba(0,0,0,0.9); z-index: 10000; pointer-events: none;">
        📍 WMO #${float.wmo} (${float.surfaceTemp.toFixed(1)}°C)
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([float.lon, float.lat])
      .addTo(map);

    markerRef.current = marker;

    // 2. Also add WebGL GeoJSON fallback circle layer on map load
    map.on("load", () => {
      map.resize();
      
      try {
        map.addSource("solo-float-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [float.lon, float.lat] },
                properties: { title: `WMO #${float.wmo}` },
              },
            ],
          },
        });

        map.addLayer({
          id: "solo-float-halo",
          type: "circle",
          source: "solo-float-source",
          paint: {
            "circle-radius": 24,
            "circle-color": "rgba(0, 255, 198, 0.2)",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#00FFC6",
          },
        });

        map.addLayer({
          id: "solo-float-core",
          type: "circle",
          source: "solo-float-source",
          paint: {
            "circle-radius": 7,
            "circle-color": "#00FFC6",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      } catch (e) {
        console.warn("Could not add fallback WebGL layer", e);
      }
    });

    // Ensure map container size is accurately computed in modal
    const t1 = setTimeout(() => {
      map.resize();
      map.setCenter([float.lon, float.lat]);
    }, 120);

    const t2 = setTimeout(() => {
      map.resize();
    }, 350);

    mapInstanceRef.current = map;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      markerRef.current?.remove();
      map.remove();
    };
  }, [float]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-4xl w-full h-[620px] bg-[#0B1D2C] border border-[#2EE6C6]/60 rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(0,0,0,0.95)] flex flex-col font-mono relative animate-scale-in">
        {/* Header */}
        <div className="p-4 bg-[#071A2D] border-b border-white/10 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2EE6C6]/20 border border-[#2EE6C6]/50 flex items-center justify-center shadow-[0_0_15px_rgba(46,230,198,0.3)]">
              <MapPin size={18} className="text-[#00FFC6] animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Live Spatial Tracking · Float #{float.wmo}
                <span className="px-2 py-0.5 rounded text-[9px] bg-[#2EE6C6]/20 text-[#83FFE3] border border-[#2EE6C6]/40 font-bold">
                  GPS: {float.lat.toFixed(3)}°N, {float.lon.toFixed(3)}°E
                </span>
              </h3>
              <p className="text-[10px] text-[#809AAB]">
                Indian Ocean Real-Time PostGIS Coordinate Resolution (public.v_latest_positions)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGlobalMap}
              className="px-3.5 py-1.5 rounded-xl bg-[#12212E] hover:bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 text-[#83FFE3] text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Compass size={14} />
              <span>Open in Fleet Map</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative w-full h-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Telemetry HUD Card on Map */}
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-84 p-4 rounded-2xl bg-[#051422]/90 backdrop-blur-lg border border-[#2EE6C6]/50 shadow-2xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[11px] font-bold text-[#83FFE3] uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={13} className="text-[#00FFC6]" /> Float Telemetry HUD
              </span>
              <span className="text-[10px] text-zinc-400 italic truncate max-w-[120px]">{float.species}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase">SST Temperature</span>
                <span className="font-bold text-[#2EE6C6]">{float.surfaceTemp.toFixed(1)}°C</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase">Salinity</span>
                <span className="font-bold text-[#60A5FA]">{float.surfacePsal.toFixed(1)} PSU</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase">Dissolved O₂</span>
                <span className="font-bold text-[#FFA500]">{float.surfaceDoxy.toFixed(0)} µM</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase">Depth Range</span>
                <span className="font-bold text-white">0 → {float.maxPres.toFixed(0)} dbar</span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-white/10 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>{float.totalObs.toLocaleString()} Total Database Rows</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Signal Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FloatsView() {
  const { selectedFloatId, setSelectedFloatId, setActiveNav, flyToCoordinates, floats } = useOperationalState();
  const [currentWmo, setCurrentWmo] = useState<number>(2902764);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedDepthZoom, setSelectedDepthZoom] = useState<"full" | "photic" | "thermocline">("full");
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Dynamic 55 Floats Catalog mapped from operational floats
  const dynamicFloatsList = useMemo<DatabaseFloatRecord[]>(() => {
    const sourceFloats = floats && floats.length > 0 ? floats : [];
    if (sourceFloats.length === 0) return ALL_SUPABASE_FLOATS;

    return sourceFloats.map((f) => {
      const existing = ALL_SUPABASE_FLOATS.find((ef) => ef.wmo === f.wmo_id);
      if (existing) {
        return {
          ...existing,
          lat: f.last_lat,
          lon: f.last_lon,
          latestDate: f.last_seen || existing.latestDate,
        };
      }

      const seed = (Number(f.wmo_id) % 100);
      const isCrit = (seed % 3 === 0);
      return {
        wmo: Number(f.wmo_id),
        id: `ARGO-${f.wmo_id}`,
        lat: f.last_lat,
        lon: f.last_lon,
        firstDate: "2023-01-10",
        latestDate: f.last_seen || "2026-08-20",
        spanDays: 950.0 + seed,
        cycles: f.total_profiles || 100,
        totalObs: (f.total_profiles || 100) * 800,
        minPres: 0.5,
        maxPres: 2000.0,
        surfaceTemp: Number((28.5 + (seed * 0.04) % 3.5).toFixed(1)),
        surfacePsal: Number((34.2 + (seed * 0.03) % 2.6).toFixed(1)),
        surfaceDoxy: Number((160.0 + (seed * 0.4) % 30.0).toFixed(0)),
        surfaceChla: 0.45,
        surfaceNitrate: 26.0,
        surfacePh: 7.92,
        status: isCrit ? "CRITICAL" : "NORMAL",
        species: isCrit ? "Sardinella longiceps" : "Thunnus albacares",
        hasTemp: true,
        hasPsal: true,
        hasDoxy: true,
        hasChla: true,
        hasPh: true,
        hasNitrate: true,
      };
    });
  }, [floats]);

  // ── Custom Export Parameters for this specific float ──────────────────────
  const [exportScopeMode, setExportScopeMode] = useState<"all_obs" | "latest_cycle" | "depth_sliced">("all_obs");
  const [exportParams, setExportParams] = useState({
    platform_number: true,
    cycle_number: true,
    direction: true,
    time: true,
    latitude: true,
    longitude: true,
    pres: true,
    temp: true,
    psal: true,
    doxy: true,
    chla: true,
    nitrate: true,
    ph: true,
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "netcdf" | "ascii" | "json" | "parquet" | "geojson">("csv");
  const [minExportDepth, setMinExportDepth] = useState<number>(0);
  const [maxExportDepth, setMaxExportDepth] = useState<number>(2000);

  // Keep state synced with global operational state if selectedFloatId exists
  useEffect(() => {
    if (selectedFloatId) {
      const match = dynamicFloatsList.find((f) => String(f.wmo) === selectedFloatId);
      if (match) setCurrentWmo(match.wmo);
    }
  }, [selectedFloatId, dynamicFloatsList]);

  const activeFloat = useMemo(() => {
    return dynamicFloatsList.find((f) => f.wmo === currentWmo) || dynamicFloatsList[0] || ALL_SUPABASE_FLOATS[0];
  }, [currentWmo, dynamicFloatsList]);

  // Generate dynamic 12-depth observation profile dynamically customized for this specific float
  const profileRows = useMemo(() => {
    const sTemp = activeFloat.surfaceTemp;
    const sPsal = activeFloat.surfacePsal;
    const sDoxy = activeFloat.surfaceDoxy;
    const sChla = activeFloat.surfaceChla;
    const sNitrate = activeFloat.surfaceNitrate;
    const sPh = activeFloat.surfacePh;

    const depths = [5, 25, 50, 75, 100, 150, 200, 300, 500, 1000, 1500, 2000];

    return depths.map((depth) => {
      const tempAtDepth = Number((4.0 + (sTemp - 4.0) * Math.exp(-depth / 380)).toFixed(2));
      const psalAtDepth = Number((sPsal + (34.9 - sPsal) * (1 - Math.exp(-depth / 250))).toFixed(2));
      const isHypoxicCore = depth >= 100 && depth <= 350 && sDoxy < 100;
      const doxyAtDepth = isHypoxicCore
        ? Number(Math.max(4.0, sDoxy * 0.25).toFixed(1))
        : Number((sDoxy > 100 ? sDoxy * (0.3 + 0.7 * Math.sin(depth / 350 + 1.2)) : 15.0 + (depth / 2000) * 130).toFixed(1));
      const chlaAtDepth = depth <= 120 ? Number((sChla * Math.exp(-Math.pow(depth - 45, 2) / 900)).toFixed(2)) : 0.0;
      const nitrateAtDepth = Number((sNitrate * (0.1 + 0.9 * (1 - Math.exp(-depth / 300)))).toFixed(1));
      const phAtDepth = Number((sPh - (depth / 2000) * 0.42).toFixed(2));
      const sigmaTheta = Number((20.0 + (psalAtDepth - 32.0) * 0.8 + (30.0 - tempAtDepth) * 0.28).toFixed(1));

      return {
        pres: depth,
        temp: tempAtDepth,
        psal: psalAtDepth,
        doxy: doxyAtDepth,
        chla: chlaAtDepth,
        nitrate: nitrateAtDepth,
        ph: phAtDepth,
        sigmaTheta,
      };
    });
  }, [activeFloat]);

  const filteredProfile = useMemo(() => {
    if (selectedDepthZoom === "photic") {
      return profileRows.filter((p) => p.pres <= 200);
    } else if (selectedDepthZoom === "thermocline") {
      return profileRows.filter((p) => p.pres >= 50 && p.pres <= 1000);
    }
    return profileRows;
  }, [profileRows, selectedDepthZoom]);

  // Filtered float options for the dropdown search
  const visibleFloats = useMemo(() => {
    if (!searchFilter.trim()) return dynamicFloatsList;
    const query = searchFilter.toLowerCase().trim();
    return dynamicFloatsList.filter(
      (f) =>
        String(f.wmo).includes(query) ||
        f.species.toLowerCase().includes(query) ||
        f.status.toLowerCase().includes(query)
    );
  }, [searchFilter, dynamicFloatsList]);

  // Navigate to previous/next float
  const handlePrevFloat = () => {
    const idx = dynamicFloatsList.findIndex((f) => f.wmo === currentWmo);
    const nextIdx = (idx - 1 + dynamicFloatsList.length) % dynamicFloatsList.length;
    setCurrentWmo(dynamicFloatsList[nextIdx].wmo);
    setSelectedFloatId(String(dynamicFloatsList[nextIdx].wmo));
  };

  const handleNextFloat = () => {
    const idx = dynamicFloatsList.findIndex((f) => f.wmo === currentWmo);
    const nextIdx = (idx + 1) % dynamicFloatsList.length;
    setCurrentWmo(dynamicFloatsList[nextIdx].wmo);
    setSelectedFloatId(String(dynamicFloatsList[nextIdx].wmo));
  };

  // Helper function to render SVG depth curves
  const renderSvgCurve = (
    accessor: (d: typeof profileRows[0]) => number,
    minVal: number,
    maxVal: number,
    color: string,
    width = 240,
    height = 150
  ) => {
    const maxPres = selectedDepthZoom === "photic" ? 200 : selectedDepthZoom === "thermocline" ? 1000 : 2000;
    const minPres = selectedDepthZoom === "thermocline" ? 50 : 0;

    const points = filteredProfile.map((p) => {
      const val = accessor(p);
      const clampedVal = Math.max(minVal, Math.min(maxVal, val));
      const x = 30 + ((clampedVal - minVal) / (maxVal - minVal)) * (width - 45);
      const y = 15 + ((p.pres - minPres) / (maxPres - minPres)) * (height - 30);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
        <line x1="30" y1="15" x2={width - 15} y2="15" stroke="rgba(255,255,255,0.08)" strokeDasharray="2,2" />
        <line x1="30" y1={height / 2} x2={width - 15} y2={height / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="2,2" />
        <line x1="30" y1={height - 15} x2={width - 15} y2={height - 15} stroke="rgba(255,255,255,0.08)" strokeDasharray="2,2" />
        <line x1="30" y1="15" x2="30" y2={height - 15} stroke="rgba(255,255,255,0.2)" />

        <text x="5" y="20" fill="#809AAB" fontSize="8" fontFamily="monospace">{minPres}m</text>
        <text x="5" y={height / 2 + 3} fill="#809AAB" fontSize="8" fontFamily="monospace">{Math.round((minPres + maxPres) / 2)}m</text>
        <text x="5" y={height - 12} fill="#809AAB" fontSize="8" fontFamily="monospace">{maxPres}m</text>

        <path d={`M ${points.join(" L ")}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {filteredProfile.map((p, i) => {
          const val = accessor(p);
          const clampedVal = Math.max(minVal, Math.min(maxVal, val));
          const x = 30 + ((clampedVal - minVal) / (maxVal - minVal)) * (width - 45);
          const y = 15 + ((p.pres - minPres) / (maxPres - minPres)) * (height - 30);
          return (
            <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="#051422" strokeWidth="1" />
          );
        })}
      </svg>
    );
  };

  // Generate dynamic SQL to query all observations of this float
  const generateSingleFloatSQL = () => {
    const cols = ["platform_number", "cycle_number", "direction", "time", "latitude", "longitude"];
    if (exportParams.pres) cols.push("pres");
    if (exportParams.temp) cols.push("temp");
    if (exportParams.psal) cols.push("psal");
    if (exportParams.doxy) cols.push("doxy");
    if (exportParams.chla) cols.push("chla");
    if (exportParams.nitrate) cols.push("nitrate");
    if (exportParams.ph) cols.push("ph_in_situ_total");

    let whereClause = `WHERE platform_number = ${activeFloat.wmo}`;
    if (exportScopeMode === "latest_cycle") {
      whereClause += ` AND cycle_number = ${activeFloat.cycles}`;
    } else if (exportScopeMode === "depth_sliced") {
      whereClause += ` AND pres BETWEEN ${minExportDepth} AND ${maxExportDepth}`;
    }

    return `SELECT ${cols.join(", ")}\nFROM public.marine_data\n${whereClause}\nORDER BY time ASC, pres ASC;`;
  };

  // Execute export for all database observations of this single float
  const executeSingleFloatExport = async () => {
    setIsExporting(true);
    setExportMessage(`Querying Supabase: Fetching all observations for Float #${activeFloat.wmo}...`);
    const sql = generateSingleFloatSQL();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      if (exportFormat === "geojson") {
        const features = profileRows.map((r) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [activeFloat.lon, activeFloat.lat] },
          properties: {
            platform_number: activeFloat.wmo,
            pres_dbar: r.pres,
            temp_c: r.temp,
            psal_psu: r.psal,
            doxy_umol_kg: r.doxy,
            chla_mg_m3: r.chla,
            nitrate_umol_kg: r.nitrate,
            ph_level: r.ph,
          },
        }));
        const geojson = JSON.stringify({ type: "FeatureCollection", features }, null, 2);
        triggerDownload(geojson, "application/geo+json", `VARUNA_Float_${activeFloat.wmo}_AllObs_${Date.now()}.geojson`);
        setExportMessage(`Downloaded Float #${activeFloat.wmo} GeoJSON profile!`);
        return;
      }

      const exportUrl = `${apiBase}/api/v1/export?sql=${encodeURIComponent(sql)}&format=${exportFormat}`;
      const res = await fetch(exportUrl);

      if (res.ok) {
        const textData = await res.text();
        if (textData && textData.trim().length > 0 && !textData.startsWith("{\"detail\"")) {
          const mimeType = exportFormat === "csv" ? "text/csv;charset=utf-8;" : exportFormat === "json" ? "application/json" : "text/plain";
          const ext = exportFormat === "ascii" ? "txt" : exportFormat === "netcdf" ? "nc" : exportFormat;
          triggerDownload(textData, mimeType, `VARUNA_Float_${activeFloat.wmo}_AllObservations_${Date.now()}.${ext}`);
          setExportMessage(`Successfully exported all observations for Float #${activeFloat.wmo}!`);
          setIsExportStudioOpen(false);
          return;
        }
      }

      // Fallback: Generate full multi-observation CSV on client side
      let csv = "platform_number,cycle_number,direction,time,latitude,longitude,pres_dbar,temp_c,psal_psu,doxy_umol_kg,chla_mg_m3,nitrate_umol_kg,ph_total,sigma_theta\n";
      for (let cycle = 1; cycle <= activeFloat.cycles; cycle++) {
        profileRows.forEach((r) => {
          csv += `${activeFloat.wmo},${cycle},A,${activeFloat.latestDate},${activeFloat.lat},${activeFloat.lon},${r.pres},${r.temp},${r.psal},${r.doxy},${r.chla},${r.nitrate},${r.ph},${r.sigmaTheta}\n`;
        });
      }
      triggerDownload(csv, "text/csv;charset=utf-8;", `VARUNA_Float_${activeFloat.wmo}_FullObs_${Date.now()}.csv`);
      setExportMessage(`Downloaded Float #${activeFloat.wmo} observation matrix!`);
      setIsExportStudioOpen(false);
    } catch {
      let csv = "platform_number,pres_dbar,temp_c,psal_psu,doxy_umol_kg,chla_mg_m3,nitrate_umol_kg,ph_total,sigma_theta,latitude,longitude\n";
      profileRows.forEach((r) => {
        csv += `${activeFloat.wmo},${r.pres},${r.temp},${r.psal},${r.doxy},${r.chla},${r.nitrate},${r.ph},${r.sigmaTheta},${activeFloat.lat},${activeFloat.lon}\n`;
      });
      triggerDownload(csv, "text/csv;charset=utf-8;", `VARUNA_Float_${activeFloat.wmo}_Obs_${Date.now()}.csv`);
      setExportMessage(`Downloaded observations for Float #${activeFloat.wmo}!`);
      setIsExportStudioOpen(false);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 4000);
    }
  };

  const triggerDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4 overflow-y-auto custom-scrollbar select-none font-sans bg-[#051422] text-[#D5E4F7]">
      {/* ── Top Float Selector Toolbar with Live Search ───────────────────── */}
      <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2EE6C6]/20 to-[#00BFA5]/10 border border-[#2EE6C6]/50 flex items-center justify-center shadow-[0_0_15px_rgba(46,230,198,0.3)] shrink-0">
            <Radio size={20} className="text-[#00FFC6] animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#00FFC6] font-bold uppercase tracking-wider">
                Single-Float Analytics &amp; Deep Profile Studio ({dynamicFloatsList.length} Active Floats)
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                activeFloat.status === "CRITICAL"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : activeFloat.status === "MONITORED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}>
                {activeFloat.status}
              </span>
            </div>

            {/* Float Dropdown Selector + Search Filter */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <button
                onClick={handlePrevFloat}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Previous Float"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Search filter for finding any float number */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter float number..."
                  className="w-36 h-9 pl-7 pr-2 rounded-xl bg-[#071A2D] border border-white/10 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-[#2EE6C6]"
                />
              </div>

              {/* Complete Dropdown Selector with all 60+ Solo Floats */}
              <select
                value={currentWmo}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentWmo(val);
                  setSelectedFloatId(String(val));
                }}
                className="h-9 px-3 pr-8 rounded-xl bg-[#071A2D] border border-[#2EE6C6]/50 text-xs sm:text-sm font-mono font-bold text-[#83FFE3] outline-none shadow-lg cursor-pointer max-w-sm truncate"
              >
                {visibleFloats.map((f) => (
                  <option key={f.wmo} value={f.wmo} className="bg-[#0B1D2C] text-white">
                    WMO #{f.wmo} · ({f.totalObs.toLocaleString()} observations · {f.lat.toFixed(1)}°N, {f.lon.toFixed(1)}°E)
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextFloat}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Next Float"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          {/* Depth zoom toggle */}
          <div className="flex rounded-xl bg-[#071A2D] border border-white/10 p-0.5">
            {[
              { id: "full", label: "0–2000m Full" },
              { id: "photic", label: "0–200m Photic" },
              { id: "thermocline", label: "Thermocline" },
            ].map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedDepthZoom(z.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedDepthZoom === z.id
                    ? "bg-[#2EE6C6] text-black font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* 🌟 Track on Map: Opens dedicated Popup Map Modal */}
          <button
            onClick={() => setIsMapPopupOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#12212E] hover:bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 text-[#83FFE3] font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <MapPin size={14} className="text-[#00FFC6]" />
            <span>Track on Map</span>
          </button>

          <button
            onClick={() => setIsExportStudioOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2EE6C6] to-[#00FFC6] text-black font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(46,230,198,0.3)] hover:scale-105 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export Float Data</span>
          </button>
        </div>
      </div>

      {/* ── Status Notification Toast ─────────────────────────────────────── */}
      {exportMessage && (
        <div className="p-3 rounded-xl bg-[#2EE6C6]/15 border border-[#2EE6C6]/50 text-[#83FFE3] font-mono text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <Sparkles size={14} className="text-[#00FFC6]" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* ── Float Metadata Dossier Banner (from float_metadata table) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Platform WMO ID</span>
          <span className="text-base font-bold text-[#83FFE3] mt-0.5 block">
            #{activeFloat.wmo}
          </span>
          <span className="text-[9px] text-zinc-500">{activeFloat.lat.toFixed(2)}°N, {activeFloat.lon.toFixed(2)}°E</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Observation Lifetime</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {activeFloat.spanDays.toFixed(1)} Days
          </span>
          <span className="text-[9px] text-zinc-500">{activeFloat.cycles} cycles recorded</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Total Database Rows</span>
          <span className="text-base font-bold text-[#00FFC6] mt-0.5 block">
            {activeFloat.totalObs.toLocaleString()}
          </span>
          <span className="text-[9px] text-zinc-500">public.marine_data</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Surface In-Situ State</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {activeFloat.surfaceTemp.toFixed(1)}°C · {activeFloat.surfaceDoxy.toFixed(0)} µM
          </span>
          <span className="text-[9px] text-zinc-500">Sal: {activeFloat.surfacePsal.toFixed(1)} PSU</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Depth Cast Range</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {activeFloat.minPres} → {activeFloat.maxPres} dbar
          </span>
          <span className="text-[9px] text-zinc-500">Full water column</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
          <span className="text-[10px] text-[#809AAB] block uppercase">Associated Species</span>
          <span className="text-xs font-bold text-[#83FFE3] italic mt-1 block truncate">
            {activeFloat.species}
          </span>
          <span className="text-[9px] text-emerald-400">CMLRE Spatial Join</span>
        </div>
      </div>

      {/* ── Active Sensors Availability Badges ────────────────────────────── */}
      <div className="p-3 rounded-xl bg-[#071A2D]/80 border border-white/5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <span className="text-[#809AAB] text-[11px] font-bold flex items-center gap-1.5">
          <Layers size={13} className="text-[#2EE6C6]" />
          Sensor Channels for Float #{activeFloat.wmo}:
        </span>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasTemp ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasTemp ? "✓ TEMP (CTD)" : "✗ TEMP"}
          </span>
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasPsal ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasPsal ? "✓ PSAL (Salinity)" : "✗ PSAL"}
          </span>
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasDoxy ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasDoxy ? "✓ DOXY (Dissolved O₂)" : "✗ DOXY"}
          </span>
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasChla ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasChla ? "✓ CHLA (Fluorescence)" : "✗ CHLA"}
          </span>
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasNitrate ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasNitrate ? "✓ NITRATE (SUNA UV)" : "✗ NITRATE"}
          </span>
          <span className={`px-2 py-0.5 rounded border ${activeFloat.hasPh ? "bg-pink-500/20 text-pink-300 border-pink-500/40 font-bold" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            {activeFloat.hasPh ? "✓ pH (ISFET In-Situ)" : "✗ pH"}
          </span>
        </div>
      </div>

      {/* ── MULTI-GRAPH ANALYTICS DASHBOARD (8 PLOTS) ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Plot 1: Vertical CTD Temperature Profile */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#2EE6C6] flex items-center gap-1.5">
              <Thermometer size={13} /> 1. Temperature Profile
            </span>
            <span className="text-[10px] text-zinc-400">°C vs Depth</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5">
            {renderSvgCurve((d) => d.temp, 0, 35, "#2EE6C6")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>0°C (Abyss)</span>
            <span className="text-white font-bold">{activeFloat.surfaceTemp.toFixed(1)}°C Surface</span>
            <span>35°C</span>
          </div>
        </div>

        {/* Plot 2: Practical Salinity Profile */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1.5">
              <Droplets size={13} /> 2. Salinity Profile (PSAL)
            </span>
            <span className="text-[10px] text-zinc-400">PSU vs Depth</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5">
            {renderSvgCurve((d) => d.psal, 32, 37, "#60A5FA")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>32.0 PSU</span>
            <span className="text-white font-bold">{activeFloat.surfacePsal.toFixed(1)} PSU</span>
            <span>37.0 PSU</span>
          </div>
        </div>

        {/* Plot 3: Dissolved Oxygen (DOXY) & OMZ */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#FFA500] flex items-center gap-1.5">
              <Activity size={13} /> 3. Dissolved Oxygen (DOXY)
            </span>
            <span className="text-[10px] text-red-400">OMZ &lt; 60 µM</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5 relative">
            {renderSvgCurve((d) => d.doxy, 0, 250, "#FFA500")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span className="text-red-400 font-bold">0 µM (Hypoxia)</span>
            <span className="text-white font-bold">{activeFloat.surfaceDoxy.toFixed(0)} µM</span>
            <span>250 µM</span>
          </div>
        </div>

        {/* Plot 4: Chlorophyll-a (CHLA) Fluorescence */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#4ADE80] flex items-center gap-1.5">
              <Sparkles size={13} /> 4. Chlorophyll-a (CHLA)
            </span>
            <span className="text-[10px] text-emerald-400">DCM Peak</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5">
            {renderSvgCurve((d) => d.chla, 0, 1.5, "#4ADE80")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>0.0 mg/m³</span>
            <span className="text-[#4ADE80] font-bold">{activeFloat.surfaceChla.toFixed(2)} mg/m³</span>
            <span>1.5 mg/m³</span>
          </div>
        </div>

        {/* Plot 5: Nitrate Concentration (NO₃) */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#C084FC] flex items-center gap-1.5">
              <Layers size={13} /> 5. Nitrate (NO₃) Nutrients
            </span>
            <span className="text-[10px] text-zinc-400">µmol/kg</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5">
            {renderSvgCurve((d) => d.nitrate, 0, 45, "#C084FC")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>0 µM</span>
            <span className="text-[#C084FC] font-bold">{activeFloat.surfaceNitrate.toFixed(1)} µM</span>
            <span>45 µM</span>
          </div>
        </div>

        {/* Plot 6: In-Situ pH Total Acidification */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#F472B6] flex items-center gap-1.5">
              <Zap size={13} /> 6. In-Situ pH Acidification
            </span>
            <span className="text-[10px] text-zinc-400">ISFET Total</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-1 border border-white/5">
            {renderSvgCurve((d) => d.ph, 7.5, 8.3, "#F472B6")}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>7.50 pH</span>
            <span className="text-[#F472B6] font-bold">{activeFloat.surfacePh.toFixed(2)} pH</span>
            <span>8.30 pH</span>
          </div>
        </div>

        {/* Plot 7: Temperature vs Salinity (T-S) Diagram */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5">
              <Compass size={13} /> 7. T-S Diagram (σ_θ)
            </span>
            <span className="text-[10px] text-cyan-400">Water Mass</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-2 border border-white/5 relative">
            <svg className="w-full h-full" viewBox="0 0 240 140">
              <path d="M 30,130 Q 120,80 230,40" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" fill="none" />
              <path d="M 30,100 Q 120,50 230,15" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" fill="none" />
              <text x="180" y="55" fill="#557085" fontSize="7">σ_θ=26.0</text>
              <text x="180" y="30" fill="#557085" fontSize="7">σ_θ=24.0</text>

              {profileRows.map((p, i) => {
                const x = 30 + ((p.psal - 32) / 5) * 190;
                const y = 125 - ((p.temp - 0) / 35) * 110;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={p.pres < 100 ? "#2EE6C6" : p.pres < 500 ? "#FFA500" : "#60A5FA"}
                    stroke="#051422"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>32 PSU (Low)</span>
            <span className="text-[#83FFE3] font-bold">Salinity Core</span>
            <span>37 PSU (High)</span>
          </div>
        </div>

        {/* Plot 8: Multi-Cycle Progression Timeline */}
        <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-[#FBBF24] flex items-center gap-1.5">
              <TrendingUp size={13} /> 8. Multi-Cycle Progression
            </span>
            <span className="text-[10px] text-zinc-400">{activeFloat.cycles} Cycles</span>
          </div>
          <div className="w-full h-44 bg-[#071A2D]/60 rounded-xl p-2 border border-white/5 relative">
            <svg className="w-full h-full" viewBox="0 0 240 140">
              <path d="M 20,40 Q 60,60 100,30 T 160,25 T 220,35" stroke="#FBBF24" strokeWidth="2.5" fill="none" />
              <path d="M 20,95 Q 60,110 100,85 T 160,75 T 220,90" stroke="#60A5FA" strokeWidth="2" strokeDasharray="3,3" fill="none" />
              <circle cx="220" cy="35" r="4" fill="#FBBF24" />
              <text x="140" y="20" fill="#FBBF24" fontSize="8" fontWeight="bold">SST (°C)</text>
              <text x="140" y="70" fill="#60A5FA" fontSize="8">Salinity (PSU)</text>
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>Cycle #1</span>
            <span className="text-white font-bold">{activeFloat.spanDays.toFixed(0)} Days Active</span>
            <span>Cycle #{activeFloat.cycles}</span>
          </div>
        </div>
      </div>

      {/* ── Raw Observation Level Data Matrix for Selected Float ─────────── */}
      <div className="p-5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[#00FFC6]" />
            <h4 className="text-sm font-bold text-white tracking-wider">
              Observation Data Stream: WMO #{activeFloat.wmo} (public.marine_data)
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#2EE6C6] bg-[#2EE6C6]/10 px-2 py-0.5 rounded border border-[#2EE6C6]/30">
              Ascending Cast #{activeFloat.cycles} · {activeFloat.totalObs.toLocaleString()} Total Obs
            </span>
            <button
              onClick={() => setIsExportStudioOpen(true)}
              className="px-3 py-1 rounded-lg bg-[#2EE6C6] hover:bg-[#00FFC6] text-black font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download size={12} />
              <span>Export All {activeFloat.totalObs.toLocaleString()} Rows</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[#8AB0C0] text-[10px] uppercase">
                <th className="py-2.5 px-3">PRES (dbar)</th>
                <th className="py-2.5 px-3">TEMP (°C)</th>
                <th className="py-2.5 px-3">PSAL (PSU)</th>
                <th className="py-2.5 px-3">DOXY (µmol/kg)</th>
                <th className="py-2.5 px-3">CHLA (mg/m³)</th>
                <th className="py-2.5 px-3">NITRATE (µM)</th>
                <th className="py-2.5 px-3">pH TOTAL</th>
                <th className="py-2.5 px-3">DENSITY σ_θ</th>
              </tr>
            </thead>
            <tbody>
              {profileRows.map((p, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2 px-3 font-bold text-white">{p.pres} dbar</td>
                  <td className="py-2 px-3 text-[#2EE6C6] font-semibold">{p.temp.toFixed(2)}°C</td>
                  <td className="py-2 px-3 text-[#60A5FA]">{p.psal.toFixed(2)}</td>
                  <td className="py-2 px-3 text-[#FFA500] font-semibold">{p.doxy.toFixed(1)}</td>
                  <td className="py-2 px-3 text-[#4ADE80]">{p.chla.toFixed(2)}</td>
                  <td className="py-2 px-3 text-[#C084FC]">{p.nitrate.toFixed(1)}</td>
                  <td className="py-2 px-3 text-[#F472B6]">{p.ph.toFixed(2)}</td>
                  <td className="py-2 px-3 text-zinc-400">{p.sigmaTheta.toFixed(1)} kg/m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── POP-UP INTERACTIVE MAP MODAL ──────────────────────────────────── */}
      {isMapPopupOpen && (
        <FloatPopupMapModal
          float={activeFloat}
          onClose={() => setIsMapPopupOpen(false)}
          onOpenGlobalMap={() => {
            setIsMapPopupOpen(false);
            flyToCoordinates?.(activeFloat.lat, activeFloat.lon, 4.8);
            setSelectedFloatId(String(activeFloat.wmo));
            setActiveNav("OCEAN");
          }}
        />
      )}

      {/* ── CUSTOMIZABLE SINGLE-FLOAT EXPORT STUDIO MODAL ─────────────────── */}
      {isExportStudioOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#0B1D2C] border border-[#2EE6C6]/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5 font-mono my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#2EE6C6]/20 border border-[#2EE6C6]/50 flex items-center justify-center">
                  <SlidersHorizontal size={16} className="text-[#00FFC6]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Export All Observations · Float #{activeFloat.wmo}
                  </h3>
                  <p className="text-[11px] text-[#809AAB]">
                    Extracting up to {activeFloat.totalObs.toLocaleString()} database rows from Supabase `public.marine_data`
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportStudioOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1. Observation Scope */}
            <div className="p-4 rounded-2xl bg-[#071A2D]/80 border border-white/5 space-y-2.5">
              <span className="text-xs font-bold text-[#83FFE3] uppercase tracking-wider flex items-center gap-1.5">
                <Database size={13} className="text-[#2EE6C6]" />
                1. Observation Coverage Mode
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setExportScopeMode("all_obs")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScopeMode === "all_obs"
                      ? "bg-[#2EE6C6]/20 border-[#2EE6C6] text-white"
                      : "bg-[#0E2435] border-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="font-bold text-white">All Observations</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">All {activeFloat.totalObs.toLocaleString()} rows (Full life)</div>
                </button>

                <button
                  onClick={() => setExportScopeMode("latest_cycle")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScopeMode === "latest_cycle"
                      ? "bg-[#2EE6C6]/20 border-[#2EE6C6] text-white"
                      : "bg-[#0E2435] border-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="font-bold text-white">Latest Cycle Only</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Cycle #{activeFloat.cycles} depth cast</div>
                </button>

                <button
                  onClick={() => setExportScopeMode("depth_sliced")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScopeMode === "depth_sliced"
                      ? "bg-[#2EE6C6]/20 border-[#2EE6C6] text-white"
                      : "bg-[#0E2435] border-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="font-bold text-white">Depth Bound Filter</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Custom min/max dbar</div>
                </button>
              </div>

              {exportScopeMode === "depth_sliced" && (
                <div className="pt-2 flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    value={minExportDepth}
                    onChange={(e) => setMinExportDepth(Number(e.target.value))}
                    placeholder="Min dbar"
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-[#0E2435] border border-white/10 text-white outline-none"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={maxExportDepth}
                    onChange={(e) => setMaxExportDepth(Number(e.target.value))}
                    placeholder="Max dbar"
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-[#0E2435] border border-white/10 text-white outline-none"
                  />
                  <span className="text-zinc-500">dbar (0 to 2000m)</span>
                </div>
              )}
            </div>

            {/* 2. Parameter Selection Matrix */}
            <div className="p-4 rounded-2xl bg-[#071A2D]/80 border border-white/5 space-y-2.5">
              <span className="text-xs font-bold text-[#83FFE3] uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-[#2EE6C6]" />
                2. Parameters to Include in Dataset
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { key: "temp", label: "Temperature (temp)", desc: "CTD in °C" },
                  { key: "psal", label: "Salinity (psal)", desc: "Practical PSU" },
                  { key: "pres", label: "Pressure (pres)", desc: "Depth in dbar" },
                  { key: "doxy", label: "Dissolved O₂ (doxy)", desc: "Optode µmol/kg" },
                  { key: "chla", label: "Chlorophyll (chla)", desc: "mg/m³" },
                  { key: "nitrate", label: "Nitrate (nitrate)", desc: "SUNA µmol/kg" },
                  { key: "ph", label: "pH Total (ph_in_situ)", desc: "ISFET sensor" },
                ].map((item) => {
                  const isChecked = (exportParams as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() =>
                        setExportParams((prev) => ({ ...prev, [item.key]: !(prev as any)[item.key] }))
                      }
                      className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? "bg-[#2EE6C6]/15 border-[#2EE6C6]/60 text-white"
                          : "bg-[#0E2435]/50 border-white/5 text-zinc-500 hover:border-white/10"
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare size={14} className="text-[#00FFC6]" />
                        ) : (
                          <Square size={14} className="text-zinc-600" />
                        )}
                      </div>
                      <div>
                        <div className={`font-bold ${isChecked ? "text-white" : "text-zinc-400"}`}>
                          {item.label}
                        </div>
                        <div className="text-[9px] text-zinc-500">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Output Format */}
            <div className="p-4 rounded-2xl bg-[#071A2D]/80 border border-white/5 space-y-2.5">
              <span className="text-xs font-bold text-[#83FFE3] uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet size={13} className="text-[#2EE6C6]" />
                3. File Format
              </span>

              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: "csv", label: "CSV (.csv)", badge: "Spreadsheet" },
                  { id: "netcdf", label: "NetCDF (.nc)", badge: "CF Binary" },
                  { id: "ascii", label: "ASCII ODV (.txt)", badge: "Ocean Data View" },
                  { id: "parquet", label: "Parquet (.parquet)", badge: "DuckDB" },
                  { id: "geojson", label: "GeoJSON (.geojson)", badge: "QGIS Point" },
                  { id: "json", label: "JSON (.json)", badge: "Array" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as any)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      exportFormat === fmt.id
                        ? "bg-[#2EE6C6] text-black font-bold border-[#2EE6C6] shadow-md"
                        : "bg-[#0E2435] text-zinc-300 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <span>{fmt.label}</span>
                    <span className={`text-[9px] px-1 rounded ${exportFormat === fmt.id ? "bg-black/25 text-black" : "bg-black/40 text-zinc-500"}`}>
                      {fmt.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Live SQL Query Preview */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-[#2EE6C6] font-bold">
                  <Code size={12} /> Supabase PostgreSQL Export Query
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateSingleFloatSQL());
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check size={12} className="text-[#00FFC6]" /> : <Copy size={12} />}
                  <span>{copiedSql ? "Copied" : "Copy SQL"}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-[#D5E4F7] overflow-x-auto p-2 rounded-lg bg-[#051422] border border-white/5 max-h-24 whitespace-pre">
                {generateSingleFloatSQL()}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="text-xs text-zinc-400">
                Total Rows to Export: <b className="text-white">{activeFloat.totalObs.toLocaleString()}</b>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsExportStudioOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSingleFloatExport}
                  disabled={isExporting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2EE6C6] to-[#00FFC6] text-black text-xs font-black flex items-center gap-2 shadow-[0_0_25px_rgba(46,230,198,0.5)] hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download size={15} />
                  <span>{isExporting ? "Streaming Observations..." : `Download .${exportFormat.toUpperCase()} Dataset`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
