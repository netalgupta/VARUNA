"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CONFIG, BASIN_PRESETS } from "@/config/map";
import { getVarunaMapStyle } from "./mapStyle";
import { anomaliesToGeoJSON } from "./mapLayers";
import { useOperationalState } from "@/providers/OperationalProvider";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Compass,
  Moon,
  Sun,
} from "lucide-react";

interface VarunaMapProps {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}

export function VarunaMap({ onHoverCoords }: VarunaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Marker storage refs to prevent memory leaks and allow smooth updates
  const floatMarkersRef = useRef<maplibregl.Marker[]>([]);
  const bioMarkersRef = useRef<maplibregl.Marker[]>([]);
  const alertBadgesRef = useRef<maplibregl.Marker[]>([]);

  const [mapTheme, setMapTheme] = useState<"dark" | "voyager">("dark");
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

  const {
    floats,
    biodiversity,
    anomalies,
    mapLayers,
    selectedFloatId,
    setSelectedFloatId,
    selectedAlertId,
    setSelectedAlertId,
    setSelectedSpecies,
    registerFlyToHandler,
  } = useOperationalState();

  // ── Sync HTML DOM Markers for Floats & Biodiversity ───────────────────────
  const updateDomMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. CLEAR OLD FLOAT MARKERS
    floatMarkersRef.current.forEach((m) => m.remove());
    floatMarkersRef.current = [];

    // 2. RENDER ARGO FLOATS
    if (mapLayers.argoFloats && floats && floats.length > 0) {
      floats.forEach((f: any) => {
        const lon = Number(f.last_lon ?? f.longitude ?? f.lon);
        const lat = Number(f.last_lat ?? f.latitude ?? f.lat);
        const wmoId = String(f.wmo_id ?? f.platform_number ?? f.id ?? "");
        if (isNaN(lon) || isNaN(lat)) return;

        const isSelected = wmoId === String(selectedFloatId);

        // Marker DOM element
        const el = document.createElement("div");
        el.className = "varuna-float-marker cursor-pointer group relative flex items-center justify-center";
        el.style.width = isSelected ? "28px" : "18px";
        el.style.height = isSelected ? "28px" : "18px";

        if (isSelected) {
          el.innerHTML = `
            <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-[11px] font-medium whitespace-nowrap shadow-lg z-50 pointer-events-none font-sans">
              ARGO ${wmoId}
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="relative w-3 h-3 rounded-full bg-blue-500 hover:bg-blue-400 border-[1.5px] border-zinc-900 shadow-sm transition-transform hover:scale-125 flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-white"></div>
            </div>
            <div class="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] whitespace-nowrap shadow-md z-50 pointer-events-none font-sans">
              ARGO ${wmoId}
            </div>
          `;
        }

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (String(selectedFloatId) === String(wmoId)) {
            setSelectedFloatId("");
          } else {
            setSelectedFloatId(wmoId);
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lon, lat])
          .addTo(map);

        floatMarkersRef.current.push(marker);
      });
    }

    // 3. CLEAR OLD BIODIVERSITY MARKERS
    bioMarkersRef.current.forEach((m) => m.remove());
    bioMarkersRef.current = [];

    // 4. RENDER CMLRE BIODIVERSITY SPECIES
    if (mapLayers.biodiversity && biodiversity && biodiversity.length > 0) {
      biodiversity.forEach((b: any) => {
        const lon = Number(b.longitude ?? b.lon);
        const lat = Number(b.latitude ?? b.lat);
        if (isNaN(lon) || isNaN(lat)) return;

        const el = document.createElement("div");
        el.className = "varuna-bio-marker cursor-pointer group relative flex items-center justify-center";
        el.style.width = "16px";
        el.style.height = "16px";
        el.innerHTML = `
          <div class="relative w-2.5 h-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 border-[1.5px] border-zinc-900 shadow-sm transition-transform hover:scale-125"></div>
          <div class="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] whitespace-nowrap shadow-md z-50 pointer-events-none font-sans">
            ${b.scientific_name || b.name}
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (b.scientific_name || b.name) {
            setSelectedSpecies(String(b.scientific_name || b.name));
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lon, lat])
          .addTo(map);

        bioMarkersRef.current.push(marker);
      });
    }

    // 5. CLEAR OLD ALERT BADGES (removed hardcoded tags)
    alertBadgesRef.current.forEach((m) => m.remove());
    alertBadgesRef.current = [];
  }, [floats, biodiversity, mapLayers, selectedFloatId, setSelectedFloatId, setSelectedSpecies]);

  // ── Initialize MapLibre 2D Tactical Map ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getVarunaMapStyle(mapTheme) as any,
      center: [MAP_CONFIG.INITIAL_CENTER.lon, MAP_CONFIG.INITIAL_CENTER.lat],
      zoom: MAP_CONFIG.INITIAL_ZOOM,
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      maxBounds: MAP_CONFIG.MAX_BOUNDS,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    const onReady = () => {
      map.resize();
      updateDomMarkers();
    };

    map.on("load", onReady);
    map.on("styledata", () => {
      updateDomMarkers();
    });

    if (map.isStyleLoaded()) {
      onReady();
    }

    // Cursor coordinates tracking
    map.on("mousemove", (e: any) => {
      const coords = {
        lat: Math.round(e.lngLat.lat * 10000) / 10000,
        lon: Math.round(e.lngLat.lng * 10000) / 10000,
      };
      setHoverCoords(coords);
      onHoverCoords?.(coords);
    });

    map.on("mouseout", () => {
      setHoverCoords(null);
      onHoverCoords?.(null);
    });

    // FlyTo handler registration
    registerFlyToHandler((lat: number, lon: number, zoomLevel = 4.8) => {
      map.flyTo({
        center: [lon, lat],
        zoom: zoomLevel > 1000 ? 4.8 : zoomLevel,
        essential: true,
        duration: 1200,
      });
    });

    return () => {
      floatMarkersRef.current.forEach((m) => m.remove());
      bioMarkersRef.current.forEach((m) => m.remove());
      alertBadgesRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render Markers on State Change ─────────────────────────────────────
  useEffect(() => {
    updateDomMarkers();
  }, [updateDomMarkers]);

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextTheme = mapTheme === "dark" ? "voyager" : "dark";
    setMapTheme(nextTheme);
    map.setStyle(getVarunaMapStyle(nextTheme) as any);
  }, [mapTheme]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06121E] select-none font-mono">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* ── Top Unified Tactical Command Bar (Non-overlapping) ───────────── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Basin Strategic Focus Presets */}
        <div className="flex items-center gap-1 bg-[#0B1D2C]/95 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="text-[9px] font-mono text-zinc-400 uppercase px-1.5 hidden sm:inline">Focus:</span>
          {Object.entries(BASIN_PRESETS).map(([key, basin]) => (
            <button
              key={key}
              onClick={() => {
                mapRef.current?.flyTo({
                  center: [basin.lon, basin.lat],
                  zoom: basin.zoom,
                  essential: true,
                  duration: 1000,
                });
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 hover:bg-[#2EE6C6] hover:text-black text-zinc-200 transition-all"
            >
              {basin.label}
            </button>
          ))}
        </div>

        {/* Right: Theme Toggle + Compact Status Badges */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Prominent Dark/Light Mode Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B1D2C]/95 hover:bg-[#2EE6C6] hover:text-black text-zinc-200 border border-white/15 backdrop-blur-md shadow-lg transition-all text-[10px] font-mono font-bold"
            title={`Switch to ${mapTheme === "dark" ? "Light Carto Map" : "Dark Navy Map"}`}
          >
            {mapTheme === "dark" ? (
              <>
                <Sun size={12} className="text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={12} className="text-cyan-400" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Quick Active Counts */}
          <div className="hidden lg:flex items-center gap-2 bg-[#0B1D2C]/95 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md text-[9px] font-mono text-zinc-300 shadow-lg">
            <span className="flex items-center gap-1 text-[#00E5FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]"></span>
              {floats.length} ARGO Floats
            </span>
            <span className="flex items-center gap-1 text-[#10B981]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              {biodiversity.length} Bio Records
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation Zoom & Reset Controls ───────────────────────── */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-1.5 rounded bg-[#0B1D2C]/90 border border-white/10 text-zinc-300 hover:text-white"
          title="Zoom In"
        >
          <Maximize2 size={12} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-1.5 rounded bg-[#0B1D2C]/90 border border-white/10 text-zinc-300 hover:text-white"
          title="Zoom Out"
        >
          <Minimize2 size={12} />
        </button>
        <button
          onClick={() => {
            mapRef.current?.flyTo({
              center: [MAP_CONFIG.INITIAL_CENTER.lon, MAP_CONFIG.INITIAL_CENTER.lat],
              zoom: MAP_CONFIG.INITIAL_ZOOM,
              duration: 1000,
            });
          }}
          className="p-1.5 rounded bg-[#0B1D2C]/90 border border-white/10 text-zinc-300 hover:text-white"
          title="Reset View"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* ── Coordinates HUD ───────────────────────────────────────────────── */}
      {hoverCoords && (
        <div className="absolute bottom-3 left-3 z-30 bg-[#0B1D2C]/90 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md text-[10px] text-zinc-300 flex items-center gap-2 shadow-lg">
          <Compass size={11} className="text-[#2EE6C6]" />
          <span>
            {hoverCoords.lat >= 0 ? `${hoverCoords.lat}°N` : `${Math.abs(hoverCoords.lat)}°S`},{" "}
            {hoverCoords.lon >= 0 ? `${hoverCoords.lon}°E` : `${Math.abs(hoverCoords.lon)}°W`}
          </span>
        </div>
      )}
    </div>
  );
}
