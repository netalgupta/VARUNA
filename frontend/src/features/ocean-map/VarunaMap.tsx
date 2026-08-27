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
  MapPin,
  LocateFixed,
  Loader2,
  Crosshair,
  Radio,
} from "lucide-react";

interface VarunaMapProps {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}

const COASTAL_LOCATION_PRESETS = [
  { label: "Mumbai Coast", lat: 18.95, lon: 72.83 },
  { label: "Goa Coast", lat: 15.49, lon: 73.82 },
  { label: "Kochi Coast", lat: 9.93, lon: 76.26 },
  { label: "Chennai Coast", lat: 13.08, lon: 80.27 },
  { label: "Vizag Coast", lat: 17.68, lon: 83.21 },
];

export function VarunaMap({ onHoverCoords }: VarunaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Marker storage refs to prevent memory leaks and allow smooth updates
  const floatMarkersRef = useRef<maplibregl.Marker[]>([]);
  const bioMarkersRef = useRef<maplibregl.Marker[]>([]);
  const alertBadgesRef = useRef<maplibregl.Marker[]>([]);
  const userLocationMarkerRef = useRef<maplibregl.Marker[]>([]);

  const [mapTheme, setMapTheme] = useState<"dark" | "voyager">("dark");
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

  // User Location State
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    label: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [nearestFloat, setNearestFloat] = useState<{
    wmo: string;
    distKm: number;
    lat: number;
    lon: number;
  } | null>(null);

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
            <div class="absolute inset-0 rounded-full bg-rose-500/40 animate-ping"></div>
            <div class="relative w-5 h-5 rounded-full bg-[#FF3366] border-2 border-white shadow-[0_0_12px_#FF3366] flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#0B1D2C] border border-[#FF3366] text-[#FF3366] text-[9px] font-mono font-bold whitespace-nowrap shadow-lg z-50 pointer-events-none">
              ★ #${wmoId}
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="absolute inset-0 rounded-full bg-[#00FFC6]/20 group-hover:scale-150 transition-transform duration-300"></div>
            <div class="relative w-3.5 h-3.5 rounded-full bg-[#0284C7] group-hover:bg-[#00FFC6] border-2 border-white shadow-[0_0_8px_rgba(2,132,199,0.8)] transition-all flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-white"></div>
            </div>
            <div class="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#0B1D2C]/95 border border-[#2EE6C6]/50 text-[#2EE6C6] text-[9px] font-mono whitespace-nowrap shadow-md z-50 pointer-events-none">
              ARGO #${wmoId}
            </div>
          `;
        }

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedFloatId(wmoId);
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
        el.style.width = "18px";
        el.style.height = "18px";
        el.innerHTML = `
          <div class="absolute inset-0 rounded-full bg-[#10B981]/25 group-hover:scale-150 transition-transform"></div>
          <div class="relative w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white shadow-[0_0_8px_#10B981] flex items-center justify-center">
            <div class="w-1 h-1 rounded-full bg-white"></div>
          </div>
          <div class="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#061A14]/95 border border-[#10B981]/60 text-[#10B981] text-[9px] font-mono whitespace-nowrap shadow-md z-50 pointer-events-none">
            🐟 ${b.scientific_name || b.name}
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

  // Haversine distance calculator in km
  const calcDistKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // ── Render User Location Marker ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userLocationMarkerRef.current.forEach((m) => m.remove());
    userLocationMarkerRef.current = [];

    if (!userLocation) {
      setNearestFloat(null);
      return;
    }

    // Find nearest active ARGO float
    if (floats && floats.length > 0) {
      let closestWmo = "";
      let minDist = Infinity;
      let closestLat = 0;
      let closestLon = 0;

      floats.forEach((f: any) => {
        const flon = Number(f.last_lon ?? f.longitude ?? f.lon);
        const flat = Number(f.last_lat ?? f.latitude ?? f.lat);
        const wmo = String(f.wmo_id ?? f.platform_number ?? f.id ?? "");
        if (!isNaN(flon) && !isNaN(flat)) {
          const d = calcDistKm(userLocation.lat, userLocation.lon, flat, flon);
          if (d < minDist) {
            minDist = d;
            closestWmo = wmo;
            closestLat = flat;
            closestLon = flon;
          }
        }
      });

      if (minDist !== Infinity) {
        setNearestFloat({
          wmo: closestWmo,
          distKm: Math.round(minDist * 10) / 10,
          lat: closestLat,
          lon: closestLon,
        });
      }
    }

    // Create radar-pulsing user beacon DOM element
    const el = document.createElement("div");
    el.className = "varuna-user-marker relative flex items-center justify-center cursor-pointer pointer-events-auto group";
    el.style.width = "36px";
    el.style.height = "36px";
    el.innerHTML = `
      <div class="absolute -inset-3 rounded-full bg-[#00FFC6]/20 animate-ping"></div>
      <div class="absolute -inset-1.5 rounded-full bg-[#00FFC6]/30 animate-pulse"></div>
      <div class="relative w-8 h-8 rounded-full bg-[#0B1D2C] border-2 border-[#00FFC6] shadow-[0_0_18px_#00FFC6] flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FFC6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-[#0B1D2C]/95 border border-[#00FFC6] text-[#00FFC6] text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl z-50 pointer-events-none flex items-center gap-1 backdrop-blur-md">
        <span>📍 You</span>
        <span class="text-white font-normal text-[9px]">(${userLocation.lat.toFixed(2)}°N, ${userLocation.lon.toFixed(2)}°E)</span>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(map);

    userLocationMarkerRef.current = [marker];
  }, [userLocation, floats, calcDistKm]);

  // ── Locate User Action Handler ────────────────────────────────────────────
  const handleLocateUser = useCallback(
    (preset?: { lat: number; lon: number; label: string }) => {
      setShowLocationPresets(false);
      if (preset) {
        setUserLocation(preset);
        mapRef.current?.flyTo({
          center: [preset.lon, preset.lat],
          zoom: 6.2,
          essential: true,
          duration: 1200,
        });
        return;
      }

      if (typeof window === "undefined" || !navigator.geolocation) {
        handleLocateUser({ lat: 18.95, lon: 72.83, label: "Mumbai Coast" });
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const loc = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: "Live GPS Position",
          };
          setUserLocation(loc);
          mapRef.current?.flyTo({
            center: [loc.lon, loc.lat],
            zoom: 6.2,
            essential: true,
            duration: 1200,
          });
        },
        (err) => {
          setIsLocating(false);
          console.warn("[VarunaMap] Geolocation unavailable, using coastal baseline:", err);
          handleLocateUser({ lat: 18.95, lon: 72.83, label: "Mumbai Coast" });
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    },
    []
  );

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

        {/* Right: User Location Button + Theme Toggle + Compact Status Badges */}
        <div className="flex items-center gap-1.5 pointer-events-auto relative">
          {/* GPS "Locate Me" Button */}
          <div className="relative">
            <button
              onClick={() => handleLocateUser()}
              disabled={isLocating}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-lg transition-all text-[10px] font-mono font-bold ${
                userLocation
                  ? "bg-[#00FFC6] text-black border-[#00FFC6] shadow-[0_0_12px_rgba(0,255,198,0.4)]"
                  : "bg-[#0B1D2C]/95 hover:bg-[#2EE6C6] hover:text-black text-zinc-200 border-white/15"
              }`}
              title="Pin your current location on the map"
            >
              {isLocating ? (
                <Loader2 size={12} className="animate-spin text-[#00FFC6]" />
              ) : (
                <LocateFixed size={12} className={userLocation ? "text-black" : "text-[#00FFC6]"} />
              )}
              <span>{userLocation ? "Located" : "Locate Me"}</span>
            </button>
          </div>

          {/* Quick Coastal Presets Button */}
          <button
            onClick={() => setShowLocationPresets(!showLocationPresets)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B1D2C]/95 hover:bg-white/10 text-zinc-300 border border-white/10 backdrop-blur-md shadow-lg transition-all text-[10px] font-mono"
            title="Choose Indian Coastal Shore"
          >
            <MapPin size={11} className="text-[#2EE6C6]" />
            <span className="hidden sm:inline">Shores</span>
          </button>

          {/* Coastal Presets Dropdown Menu */}
          {showLocationPresets && (
            <div className="absolute top-8 right-16 bg-[#0B1D2C]/98 border border-[#2EE6C6]/30 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[9px] font-bold text-[#809AAB] px-2 py-0.5 border-b border-white/5">
                Indian Coastal Baseline
              </div>
              {COASTAL_LOCATION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleLocateUser(p)}
                  className="text-left px-2 py-1 rounded text-[10px] hover:bg-[#00FFC6]/20 hover:text-[#00FFC6] text-zinc-200 transition-colors flex items-center justify-between"
                >
                  <span>{p.label}</span>
                  <span className="text-[8px] text-zinc-500">{p.lat}°N</span>
                </button>
              ))}
            </div>
          )}

          {/* Prominent Dark/Light Mode Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B1D2C]/95 hover:bg-[#2EE6C6] hover:text-black text-zinc-200 border border-white/15 backdrop-blur-md shadow-lg transition-all text-[10px] font-mono font-bold"
            title={`Switch to ${mapTheme === "dark" ? "Light Carto Map" : "Dark Navy Map"}`}
          >
            {mapTheme === "dark" ? (
              <>
                <Sun size={12} className="text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon size={12} className="text-cyan-400" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Active User Location & Nearest Float Proximity HUD Card ────────── */}
      {userLocation && (
        <div className="absolute top-14 left-2.5 z-30 bg-[#0B1D2C]/95 border border-[#00FFC6]/40 p-2.5 rounded-xl text-white shadow-2xl backdrop-blur-md flex flex-col gap-1.5 max-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00FFC6]">
              <Radio size={12} className="animate-pulse" />
              <span>{userLocation.label}</span>
            </div>
            <button
              onClick={() => setUserLocation(null)}
              className="text-[9px] text-zinc-400 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded bg-white/5"
            >
              ✕ Clear
            </button>
          </div>

          <div className="text-[10px] text-zinc-300">
            Coordinates: <b className="text-white font-mono">{userLocation.lat.toFixed(3)}°N, {userLocation.lon.toFixed(3)}°E</b>
          </div>

          {nearestFloat && (
            <div className="bg-[#06121E]/80 border border-white/5 p-1.5 rounded-lg flex items-center justify-between text-[10px]">
              <div>
                <div className="text-[9px] text-zinc-400 uppercase">Closest ARGO Float</div>
                <div className="font-bold text-white font-mono">WMO {nearestFloat.wmo}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#00FFC6] font-bold">{nearestFloat.distKm} km</div>
                <button
                  onClick={() => {
                    setSelectedFloatId(nearestFloat.wmo);
                    mapRef.current?.flyTo({
                      center: [nearestFloat.lon, nearestFloat.lat],
                      zoom: 7,
                      duration: 1000,
                    });
                  }}
                  className="text-[8px] text-[#2EE6C6] hover:underline font-bold"
                >
                  View Profile ➔
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
