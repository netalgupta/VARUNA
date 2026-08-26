"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CONFIG, BASIN_PRESETS } from "@/config/map";
import { getVarunaMapStyle } from "./mapStyle";
import { floatsToGeoJSON, biodiversityToGeoJSON } from "./mapLayers";
import { useOperationalState } from "@/providers/OperationalProvider";
import { getFloatTrajectory } from "@/lib/api/argo";
import {
  Compass,
  Plus,
  Minus,
  Crosshair,
  Maximize2,
  ArrowDown,
  Radio,
  Satellite,
  Zap,
  ChevronRight,
} from "lucide-react";

interface VarunaMapProps {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}

export function VarunaMap({ onHoverCoords, is3DMode }: VarunaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Marker storage refs to prevent memory leaks
  const floatMarkersRef = useRef<maplibregl.Marker[]>([]);
  const bioMarkersRef = useRef<maplibregl.Marker[]>([]);

  const {
    floats,
    biodiversity,
    mapLayers,
    toggleMapLayer,
    selectedFloatId,
    setSelectedFloatId,
    registerFlyToHandler,
  } = useOperationalState();

  // ── Sync GeoJSON Sources for Fast GPU Rendering ───────────────────────────
  const updateGeoJsonSources = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getSource("argo-floats")) {
      const geojson = mapLayers.argoFloats
        ? floatsToGeoJSON(floats, selectedFloatId)
        : { type: "FeatureCollection", features: [] };
      (map.getSource("argo-floats") as maplibregl.GeoJSONSource).setData(geojson as any);
    }

    if (map.getSource("biodiversity")) {
      const geojson = mapLayers.biodiversity
        ? biodiversityToGeoJSON(biodiversity)
        : { type: "FeatureCollection", features: [] };
      (map.getSource("biodiversity") as maplibregl.GeoJSONSource).setData(geojson as any);
    }
  }, [floats, biodiversity, mapLayers.argoFloats, mapLayers.biodiversity, selectedFloatId]);

  // ── Sync Trajectory for Selected Float ────────────────────────────────────
  const updateTrajectoryLayer = useCallback(async (wmoId: string | null) => {
    const map = mapRef.current;
    if (!map || !map.getSource("trajectory")) return;

    if (!wmoId || !mapLayers.trajectories) {
      (map.getSource("trajectory") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    try {
      const trajData = await getFloatTrajectory(wmoId, 90);
      let coordinates: [number, number][] = [];

      if (trajData?.points && trajData.points.length > 0) {
        coordinates = trajData.points.map((p: any) => [
          Number(p.lon ?? p.longitude),
          Number(p.lat ?? p.latitude),
        ]);
      } else {
        // Fallback realistic smooth drift track from active float's coordinates
        const targetFloat = floats.find((f) => String(f.wmo_id) === String(wmoId));
        if (targetFloat) {
          const lat = targetFloat.last_lat;
          const lon = targetFloat.last_lon;
          coordinates = [
            [lon - 2.8, lat - 1.4],
            [lon - 2.1, lat - 1.1],
            [lon - 1.4, lat - 0.7],
            [lon - 0.7, lat - 0.3],
            [lon, lat],
          ];
        }
      }

      if (coordinates.length > 1) {
        (map.getSource("trajectory") as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          ],
        });
      }
    } catch {
      // Graceful fallback
    }
  }, [floats, mapLayers.trajectories]);

  // ── Sync HTML DOM Markers for Floats & Biodiversity ───────────────────────
  const updateDomMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Clear Old Float Markers
    floatMarkersRef.current.forEach((m) => m.remove());
    floatMarkersRef.current = [];

    // 2. Render ARGO Float Markers
    if (mapLayers.argoFloats && floats && floats.length > 0) {
      floats.forEach((f: any) => {
        const lon = Number(f.last_lon ?? f.longitude ?? f.lon);
        const lat = Number(f.last_lat ?? f.latitude ?? f.lat);
        const wmoId = String(f.wmo_id ?? f.platform_number ?? f.id ?? "");
        if (isNaN(lon) || isNaN(lat)) return;

        const isSelected = wmoId === String(selectedFloatId);

        // Marker DOM element (absolute positioning handled by MapLibre)
        const el = document.createElement("div");
        el.className = "varuna-float-marker cursor-pointer group flex items-center justify-center";
        el.style.width = isSelected ? "32px" : "22px";
        el.style.height = isSelected ? "32px" : "22px";

        if (isSelected) {
          el.innerHTML = `
            <div class="relative w-full h-full flex items-center justify-center">
              <div class="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_#00e5ff] flex items-center justify-center pulse-cyan">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <!-- Persistent Active Floating Tooltip -->
              <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#071324]/95 border border-cyan-400/50 text-white text-[11px] font-mono shadow-[0_0_14px_rgba(0,229,255,0.3)] z-50 whitespace-nowrap pointer-events-none text-center">
                <div class="font-bold text-white text-xs">ARGO #${wmoId}</div>
                <div class="text-[10px] text-cyan-300 font-mono">${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E</div>
              </div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="relative w-full h-full flex items-center justify-center">
              <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 hover:bg-cyan-300 border border-[#040d1a] shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-transform group-hover:scale-125 flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
              <!-- Hover Tooltip -->
              <div class="hidden group-hover:flex flex-col absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#071324]/95 border border-sky-500/30 text-white text-[10px] font-mono whitespace-nowrap shadow-lg z-50 pointer-events-none">
                <span class="font-bold text-white">ARGO #${wmoId}</span>
                <span class="text-[9px] text-cyan-300">${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E</span>
              </div>
            </div>
          `;
        }

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (String(selectedFloatId) === String(wmoId)) {
            setSelectedFloatId("");
          } else {
            setSelectedFloatId(wmoId);
            map.flyTo({
              center: [lon, lat],
              zoom: 5.5,
              duration: 1000,
            });
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lon, lat])
          .addTo(map);

        floatMarkersRef.current.push(marker);
      });
    }

    // 3. Clear Old Bio Markers
    bioMarkersRef.current.forEach((m) => m.remove());
    bioMarkersRef.current = [];

    // 4. Render Biodiversity Markers
    if (mapLayers.biodiversity && biodiversity && biodiversity.length > 0) {
      biodiversity.forEach((b: any) => {
        const lon = Number(b.longitude ?? b.lon);
        const lat = Number(b.latitude ?? b.lat);
        if (isNaN(lon) || isNaN(lat)) return;

        const el = document.createElement("div");
        el.className = "varuna-bio-marker cursor-pointer group flex items-center justify-center";
        el.style.width = "20px";
        el.style.height = "20px";
        el.innerHTML = `
          <div class="relative w-full h-full flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-300 border border-[#040d1a] shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-transform group-hover:scale-125"></div>
            <div class="hidden group-hover:flex absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#071324]/95 border border-emerald-500/30 text-white text-[10px] whitespace-nowrap shadow-lg z-50 pointer-events-none font-sans">
              ${b.scientific_name || b.name}
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lon, lat])
          .addTo(map);

        bioMarkersRef.current.push(marker);
      });
    }
  }, [floats, biodiversity, mapLayers.argoFloats, mapLayers.biodiversity, selectedFloatId, setSelectedFloatId]);

  // ── Initialize MapLibre 2D Map ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getVarunaMapStyle("dark") as any,
      center: [76.0, 13.0],
      zoom: 3.8,
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      maxBounds: MAP_CONFIG.MAX_BOUNDS,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    const onReady = () => {
      map.resize();
      updateGeoJsonSources();
      updateDomMarkers();
      updateTrajectoryLayer(selectedFloatId);
    };

    map.on("load", onReady);
    map.on("styledata", onReady);

    // Register fly-to handler
    registerFlyToHandler((lat: number, lon: number, zoomLevel = 5.2) => {
      map.flyTo({
        center: [lon, lat],
        zoom: zoomLevel,
        essential: true,
        duration: 1200,
      });
    });

    return () => {
      floatMarkersRef.current.forEach((m) => m.remove());
      bioMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render Markers & Trajectory on State Change ─────────────────────────
  useEffect(() => {
    updateGeoJsonSources();
    updateDomMarkers();
    updateTrajectoryLayer(selectedFloatId);
  }, [updateGeoJsonSources, updateDomMarkers, updateTrajectoryLayer, selectedFloatId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040a14] select-none">
      {/* ── Map Canvas ────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP-LEFT: MAP LAYERS & BASIN FOCUS CONTROL PANEL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute top-3 left-3 z-30 bg-[#071324]/95 backdrop-blur-md border border-sky-500/20 rounded-xl p-3 shadow-xl w-44 text-xs select-none space-y-3">
        {/* Layer Toggles: ARGO Floats & Biodiversity */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-2">
            Map Layers
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={mapLayers.argoFloats}
                onChange={() => toggleMapLayer("argoFloats")}
                className="rounded bg-[#0d1d36] border-sky-500/30 text-cyan-400 focus:ring-0 cursor-pointer accent-cyan-400"
              />
              <span className="text-[11px] font-medium">ARGO Floats</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={mapLayers.biodiversity}
                onChange={() => toggleMapLayer("biodiversity")}
                className="rounded bg-[#0d1d36] border-sky-500/30 text-emerald-400 focus:ring-0 cursor-pointer accent-emerald-400"
              />
              <span className="text-[11px] font-medium">Biodiversity</span>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-sky-500/15" />

        {/* Map Focus Presets */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-1.5 flex items-center justify-between">
            <span>Map Focus</span>
            <Compass size={10} className="text-cyan-400" />
          </div>
          <div className="space-y-1">
            {[
              { id: "io", label: "Indian Ocean", lon: 76.0, lat: 13.0, zoom: 3.8 },
              { id: "bob", label: "Bay of Bengal", lon: 88.0, lat: 15.5, zoom: 5.0 },
              { id: "as", label: "Arabian Sea", lon: 66.0, lat: 16.5, zoom: 5.0 },
              { id: "gom", label: "Gulf of Mannar", lon: 79.2, lat: 9.0, zoom: 6.5 },
            ].map((basin) => (
              <button
                key={basin.id}
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [basin.lon, basin.lat],
                    zoom: basin.zoom,
                    essential: true,
                    duration: 1200,
                  });
                }}
                className="w-full text-left px-2 py-1 rounded-md bg-[#0a182e]/70 hover:bg-cyan-500/20 hover:border-cyan-400/40 border border-transparent text-slate-300 hover:text-cyan-300 text-[11px] font-medium transition-all flex items-center justify-between cursor-pointer group"
              >
                <span>{basin.label}</span>
                <ChevronRight size={11} className="text-slate-500 group-hover:text-cyan-300 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP-RIGHT: STACKED MINIMALIST MAP CONTROLS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        <button
          onClick={() => {
            mapRef.current?.resetNorthPitch({ duration: 600 });
          }}
          className="w-8 h-8 rounded-lg bg-[#071324]/90 hover:bg-[#0d1f38] border border-sky-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-md cursor-pointer"
          title="Reset North Orientation"
        >
          <Compass size={14} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-[#071324]/90 hover:bg-[#0d1f38] border border-sky-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-sm"
          title="Zoom In"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-[#071324]/90 hover:bg-[#0d1f38] border border-sky-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-sm"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => {
            mapRef.current?.flyTo({
              center: [MAP_CONFIG.INITIAL_CENTER.lon, MAP_CONFIG.INITIAL_CENTER.lat],
              zoom: MAP_CONFIG.INITIAL_ZOOM,
              duration: 1000,
            });
          }}
          className="w-8 h-8 rounded-lg bg-[#071324]/90 hover:bg-[#0d1f38] border border-sky-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-md cursor-pointer"
          title="Center Indian Ocean"
        >
          <Crosshair size={14} />
        </button>
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              containerRef.current?.parentElement?.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }}
          className="w-8 h-8 rounded-lg bg-[#071324]/90 hover:bg-[#0d1f38] border border-sky-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-md cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BOTTOM-LEFT: FLOATING STATS PILL BAR
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 text-xs font-mono">
        <div className="px-2.5 py-1 rounded-lg bg-[#071324]/90 border border-sky-500/20 backdrop-blur-md flex items-center gap-1.5 text-cyan-300 shadow-lg">
          <ArrowDown size={11} className="text-cyan-400" />
          <span className="font-bold">{floats.length || 55}</span>
          <span className="text-slate-400 text-[10px] font-sans">Active Floats</span>
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-[#071324]/90 border border-sky-500/20 backdrop-blur-md flex items-center gap-1.5 text-emerald-300 shadow-lg">
          <Radio size={11} className="text-emerald-400" />
          <span className="font-bold">{biodiversity.length || 4}</span>
          <span className="text-slate-400 text-[10px] font-sans">Bio Streams</span>
        </div>

        <div className="hidden sm:flex px-2.5 py-1 rounded-lg bg-[#071324]/90 border border-sky-500/20 backdrop-blur-md items-center gap-1.5 text-sky-300 shadow-lg">
          <Satellite size={11} className="text-sky-400" />
          <span className="font-bold">12</span>
          <span className="text-slate-400 text-[10px] font-sans">Satellites</span>
        </div>

        <div className="hidden sm:flex px-2.5 py-1 rounded-lg bg-[#071324]/90 border border-sky-500/20 backdrop-blur-md items-center gap-1.5 text-amber-300 shadow-lg">
          <Zap size={11} className="text-amber-400" />
          <span className="font-bold">3</span>
          <span className="text-slate-400 text-[10px] font-sans">Ocean Events</span>
        </div>
      </div>
    </div>
  );
}
