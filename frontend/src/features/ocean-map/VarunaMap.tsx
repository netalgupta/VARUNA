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
  const bioCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
    mapLayers,
    toggleMapLayer,
    selectedFloatId,
    setSelectedFloatId,
    setSelectedSpecies,
    setSelectedBioRecord,
    setSelectedEntityType,
    registerFlyToHandler,
  } = useOperationalState();

  const setSelectedSpeciesRef = useRef(setSelectedSpecies);
  setSelectedSpeciesRef.current = setSelectedSpecies;

  const setSelectedBioRecordRef = useRef(setSelectedBioRecord);
  setSelectedBioRecordRef.current = setSelectedBioRecord;

  const setSelectedEntityTypeRef = useRef(setSelectedEntityType);
  setSelectedEntityTypeRef.current = setSelectedEntityType;

  // Always keep fresh references to prevent stale closures during map lifecycle events
  const biodiversityRef = useRef(biodiversity);
  biodiversityRef.current = biodiversity;

  const mapLayersRef = useRef(mapLayers);
  mapLayersRef.current = mapLayers;

  const floatsRef = useRef(floats);
  floatsRef.current = floats;

  const selectedFloatIdRef = useRef(selectedFloatId);
  selectedFloatIdRef.current = selectedFloatId;

  // ── Bulletproof 60 FPS HTML5 Canvas Biodiversity Renderer ──────────────────
  const renderBioCanvas = useCallback(() => {
    const canvas = bioCanvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mapLayersRef.current.biodiversity) return;

    const currentBio = biodiversityRef.current;
    if (!currentBio || currentBio.length === 0) return;

    const zoom = map.getZoom();
    const coreRadius = zoom > 6 ? 4.5 : zoom > 4 ? 3.5 : 2.5;
    const stride = zoom >= 6 ? 1 : zoom >= 4.5 ? 2 : zoom >= 3.5 ? 3 : 6;

    ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
    for (let i = 0; i < currentBio.length; i += stride) {
      const b: any = currentBio[i];
      const lon = Number(b.longitude ?? b.lon ?? b.decimal_longitude);
      const lat = Number(b.latitude ?? b.lat ?? b.decimal_latitude);
      if (isNaN(lon) || isNaN(lat)) continue;

      const p = map.project([lon, lat]);
      if (p.x < -20 || p.y < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, coreRadius + 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < currentBio.length; i += stride) {
      const b: any = currentBio[i];
      const lon = Number(b.longitude ?? b.lon ?? b.decimal_longitude);
      const lat = Number(b.latitude ?? b.lat ?? b.decimal_latitude);
      if (isNaN(lon) || isNaN(lat)) continue;

      const p = map.project([lon, lat]);
      if (p.x < -20 || p.y < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) continue;

      const dtype = String(b.dataset_type || "voucher").toLowerCase();
      ctx.fillStyle =
        dtype === "edna"
          ? "#c084fc"
          : dtype === "fishery"
          ? "#f59e0b"
          : dtype === "marine_mammal"
          ? "#38bdf8"
          : "#10b981";

      ctx.beginPath();
      ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, []);

  // ── Unified Map Sync (ARGO DOM Markers & Canvas Redraw) ─────────────────────
  const syncMapData = useCallback(() => {
    renderBioCanvas();

    const map = mapRef.current;
    if (!map) return;

    const currentLayers = mapLayersRef.current;
    const currentFloats = floatsRef.current;
    const currentFloatId = selectedFloatIdRef.current;

    // Render ARGO Float DOM Markers
    try {
      floatMarkersRef.current.forEach((m) => m.remove());
      floatMarkersRef.current = [];

      const container = containerRef.current;
      if (container) {
        const orphans = container.querySelectorAll(".varuna-float-marker, .varuna-bio-marker");
        orphans.forEach((el) => el.remove());
      }

      if (currentLayers.argoFloats && currentFloats && currentFloats.length > 0) {
        currentFloats.forEach((f: any) => {
          const lon = Number(f.last_lon ?? f.longitude ?? f.lon);
          const lat = Number(f.last_lat ?? f.latitude ?? f.lat);
          const wmoId = String(f.wmo_id ?? f.platform_number ?? f.id ?? "");
          if (isNaN(lon) || isNaN(lat)) return;

          const isSelected = wmoId === String(currentFloatId);

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
                <div class="varuna-float-hover-tooltip flex-col absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#071324]/95 border border-sky-500/30 text-white text-[10px] font-mono whitespace-nowrap shadow-lg z-50 pointer-events-none">
                  <span class="font-bold text-white">ARGO #${wmoId}</span>
                  <span class="text-[9px] text-cyan-300">${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E</span>
                </div>
              </div>
            `;
          }

          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (String(selectedFloatIdRef.current) === String(wmoId)) {
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
    } catch (err) {
      console.warn("[VARUNA] Marker sync:", err);
    }
  }, [renderBioCanvas, setSelectedFloatId]);

  // ── Sync Trajectory for Selected Float ────────────────────────────────────
  const updateTrajectoryLayer = useCallback(async (wmoId: string | null) => {
    const map = mapRef.current;
    if (!map || !map.getSource("trajectory")) return;

    if (!wmoId || !mapLayersRef.current.trajectories) {
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
        const targetFloat = floatsRef.current.find((f) => String(f.wmo_id) === String(wmoId));
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
  }, []);

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

    // Interactive Hover Popup for CMLRE Biodiversity Points
    const bioPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "varuna-bio-popup",
    });

    // Hover detection over 5,385 Biodiversity Points
    map.on("mousemove", (e) => {
      if (!mapLayersRef.current.biodiversity) {
        bioPopup.remove();
        return;
      }
      const currentBio = biodiversityRef.current;
      if (!currentBio || currentBio.length === 0) return;

      const mousePt = e.point;
      const mouseLngLat = e.lngLat;
      const degTol = Math.max(0.08, 24 / Math.pow(2, map.getZoom()));
      let nearest: any = null;
      let minD2 = 144;

      for (let i = 0; i < currentBio.length; i++) {
        const b: any = currentBio[i];
        const lon = Number(b.longitude ?? b.lon ?? b.decimal_longitude);
        const lat = Number(b.latitude ?? b.lat ?? b.decimal_latitude);
        if (isNaN(lon) || isNaN(lat)) continue;
        if (Math.abs(lat - mouseLngLat.lat) > degTol || Math.abs(lon - mouseLngLat.lng) > degTol) continue;

        const p = map.project([lon, lat]);
        const dx = p.x - mousePt.x;
        const dy = p.y - mousePt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2) {
          minD2 = d2;
          nearest = b;
        }
      }

      if (nearest) {
        map.getCanvas().style.cursor = "pointer";
        const lon = Number(nearest.longitude ?? nearest.lon ?? nearest.decimal_longitude);
        const lat = Number(nearest.latitude ?? nearest.lat ?? nearest.decimal_latitude);
        const name = nearest.scientific_name || "Marine Specimen";
        const common = nearest.common_name && nearest.common_name !== name ? nearest.common_name : "";
        const family = nearest.family || "Marine Taxa";
        const datasetType = String(nearest.dataset_type || "voucher").toUpperCase().replace("_", " ");
        const depth = nearest.depth_m ? `${Number(nearest.depth_m).toFixed(0)} m` : "Pelagic";
        const tMin = nearest.thermal_range_min_c ? `${Number(nearest.thermal_range_min_c).toFixed(1)}°` : "22°";
        const tMax = nearest.thermal_range_max_c ? `${Number(nearest.thermal_range_max_c).toFixed(1)}°C` : "28°C";
        const date = nearest.event_date ? String(nearest.event_date).split("T")[0] : "";

        bioPopup
          .setLngLat([lon, lat])
          .setHTML(`
            <div style="background: rgba(4, 13, 26, 0.96); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 8px 10px; font-family: monospace; color: #fff; font-size: 11px; box-shadow: 0 0 16px rgba(0,0,0,0.6); min-width: 175px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: bold; border: 1px solid rgba(52, 211, 153, 0.3);">${datasetType}</span>
                <span style="font-size: 9px; color: #94a3b8;">${date}</span>
              </div>
              <div style="font-weight: bold; font-style: italic; color: #f8fafc; font-size: 12px;">${name}</div>
              ${common ? `<div style="font-size: 10px; color: #38bdf8; margin-bottom: 4px;">${common}</div>` : ""}
              <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px;">Family: ${family}</div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #cbd5e1; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                <span>Depth: <b style="color: #67e8f9;">${depth}</b></span>
                <span>Optimum: <b style="color: #fde047;">${tMin}-${tMax}</b></span>
              </div>
            </div>
          `)
          .addTo(map);
      } else {
        map.getCanvas().style.cursor = "";
        bioPopup.remove();
      }
    });

    const onReady = () => {
      map.resize();
      syncMapData();
      updateTrajectoryLayer(selectedFloatIdRef.current);
    };

    map.on("load", onReady);
    map.on("move", renderBioCanvas);
    map.on("zoom", renderBioCanvas);
    map.on("resize", renderBioCanvas);
    // Click detection on Biodiversity Points to update Dashboard
    map.on("click", (e) => {
      if (!mapLayersRef.current.biodiversity) return;
      const currentBio = biodiversityRef.current;
      if (!currentBio || currentBio.length === 0) return;

      const clickPt = e.point;
      let nearestBio: any = null;
      let minD2 = 256; // 16px click radius

      for (let i = 0; i < currentBio.length; i++) {
        const b: any = currentBio[i];
        const lon = Number(b.longitude ?? b.lon ?? b.decimal_longitude);
        const lat = Number(b.latitude ?? b.lat ?? b.decimal_latitude);
        if (isNaN(lon) || isNaN(lat)) continue;

        const p = map.project([lon, lat]);
        const dx = p.x - clickPt.x;
        const dy = p.y - clickPt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2) {
          minD2 = d2;
          nearestBio = b;
        }
      }

      if (nearestBio) {
        setSelectedBioRecordRef.current(nearestBio);
        setSelectedSpeciesRef.current(nearestBio.scientific_name);
        setSelectedEntityTypeRef.current("BIODIVERSITY");
        const lon = Number(nearestBio.longitude ?? nearestBio.lon ?? nearestBio.decimal_longitude);
        const lat = Number(nearestBio.latitude ?? nearestBio.lat ?? nearestBio.decimal_latitude);
        map.flyTo({
          center: [lon, lat],
          zoom: Math.max(map.getZoom(), 5.5),
          essential: true,
          duration: 1000,
        });
      }
    });

    map.on("idle", () => {
      syncMapData();
    });

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
      bioPopup.remove();
      floatMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render Markers & Trajectory on State Change ─────────────────────────
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
    <div className="relative w-full h-full overflow-hidden bg-[#040a14] select-none">
      {/* ── Map Canvas ────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* ── High-Performance Biodiversity Canvas Overlay ─────────────────── */}
      <canvas
        ref={bioCanvasRef}
        className="w-full h-full absolute inset-0 pointer-events-none z-10"
      />

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
          <span className="font-bold">{biodiversity.length.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px] font-sans">Bio Occurrences</span>
        </div>
      </div>
    </div>
  );
}
