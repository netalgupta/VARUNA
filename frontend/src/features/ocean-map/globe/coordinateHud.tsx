"use client";

import React from "react";
import { Compass, Radio } from "lucide-react";

interface CoordinateHudProps {
  coords: { lat: number; lon: number } | null;
  selectedFloatId?: string | null;
  selectedFloatCoords?: { lat: number; lon: number } | null;
}

export function CoordinateHud({
  coords,
  selectedFloatId,
  selectedFloatCoords,
}: CoordinateHudProps) {
  const displayLat = coords
    ? `${Math.abs(coords.lat).toFixed(2)}° ${coords.lat >= 0 ? "N" : "S"}`
    : selectedFloatCoords
    ? `${Math.abs(selectedFloatCoords.lat).toFixed(2)}° ${selectedFloatCoords.lat >= 0 ? "N" : "S"}`
    : "10.00° N";

  const displayLon = coords
    ? `${Math.abs(coords.lon).toFixed(2)}° ${coords.lon >= 0 ? "E" : "W"}`
    : selectedFloatCoords
    ? `${Math.abs(selectedFloatCoords.lon).toFixed(2)}° ${selectedFloatCoords.lon >= 0 ? "E" : "W"}`
    : "78.00° E";

  return (
    <div className="absolute bottom-3 left-3 z-30 px-3 py-1.5 rounded-lg bg-[#020B14]/85 border border-[#2EE6C6]/25 text-[10px] font-mono text-zinc-300 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center gap-3 select-none">
      <div className="flex items-center gap-1.5 text-[#00FFC6]">
        <Compass size={12} className="animate-spin-slow" />
        <span className="font-bold">WGS84</span>
      </div>

      <div className="h-3 w-[1px] bg-white/10" />

      <div className="flex items-center gap-2">
        <span>LAT <b className="text-white font-mono">{displayLat}</b></span>
        <span className="text-zinc-500">·</span>
        <span>LON <b className="text-white font-mono">{displayLon}</b></span>
      </div>

      {selectedFloatId && (
        <>
          <div className="h-3 w-[1px] bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1 text-[#2EE6C6]">
            <Radio size={10} />
            <span>FLOAT #{selectedFloatId}</span>
          </div>
        </>
      )}
    </div>
  );
}
