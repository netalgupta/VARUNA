"use client";

import React, { useState, useMemo } from "react";
import {
  Radio,
  Search,
  CheckCircle2,
  X,
  ChevronRight,
  Compass,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function FloatDirectoryPanel() {
  const {
    floats,
    selectedFloatId,
    setSelectedFloatId,
    setActiveNav,
    flyToCoordinates,
  } = useOperationalState();

  const [searchQuery, setSearchQuery] = useState("");

  // Filter floats by WMO ID or coordinates
  const filteredFloats = useMemo(() => {
    if (!searchQuery.trim()) return floats;
    const q = searchQuery.toLowerCase().trim();
    return floats.filter((f) => {
      const wmo = String(f.wmo_id).toLowerCase();
      const coords = `${f.last_lat.toFixed(1)} ${f.last_lon.toFixed(1)}`.toLowerCase();
      return wmo.includes(q) || coords.includes(q);
    });
  }, [floats, searchQuery]);

  const handleFloatClick = (wmoId: string, lat: number, lon: number) => {
    if (String(selectedFloatId) === String(wmoId)) {
      // Toggle unselect
      setSelectedFloatId("");
    } else {
      // Select and fly to coordinates
      setSelectedFloatId(String(wmoId));
      flyToCoordinates?.(lat, lon, 2000000);
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 backdrop-blur-md flex flex-col justify-between h-[235px] select-none shadow-xl">
      {/* ── 1. Header with Title & View All ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 mb-2">
          <span className="font-mono font-bold text-slate-200 text-xs tracking-wider uppercase">
            Live Float Directory
          </span>

          <button
            onClick={() => setActiveNav("FLOATS")}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            View All
          </button>
        </div>

        {/* ── Search Input for all 55 Floats ──────────────────────────────── */}
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search 55 floats by WMO or lat/lon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-6 py-1 bg-[#050e1c] border border-sky-500/20 focus:border-cyan-400/60 rounded-md text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* ── 2. Scrollable Directory List ─────────────────────────────────── */}
        <div className="space-y-1 overflow-y-auto max-h-[110px] custom-scrollbar pr-1">
          {filteredFloats.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400 font-mono">
              No floats matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredFloats.map((f) => {
              const isSelected = String(selectedFloatId) === String(f.wmo_id);
              return (
                <div
                  key={f.wmo_id}
                  onClick={() => handleFloatClick(String(f.wmo_id), f.last_lat, f.last_lon)}
                  className={`px-2.5 py-1 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-600/90 to-blue-600/90 border-cyan-400/50 text-white shadow-[0_0_14px_rgba(0,229,255,0.35)]"
                      : "bg-[#071324]/60 border-transparent hover:border-sky-500/25 hover:bg-[#0a1b34]/70 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? "bg-white shadow-[0_0_8px_#ffffff]" : "bg-emerald-400 shadow-[0_0_4px_#34d399]"
                      }`}
                    />
                    <span className={`font-mono text-xs font-bold ${isSelected ? "text-white" : "text-slate-200"} truncate`}>
                      WMO {f.wmo_id}
                    </span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-cyan-100" : "text-slate-400"} truncate`}>
                      {f.last_lat.toFixed(1)}°N, {f.last_lon.toFixed(1)}°E
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] font-mono ${isSelected ? "text-cyan-100 font-semibold" : "text-slate-400"}`}>
                      {f.total_profiles || 100} casts
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 3. Bottom Footer Link ─────────────────────────────────────────── */}
      <div className="pt-2 border-t border-sky-500/15 flex items-center justify-between text-xs">
        <button
          onClick={() => setActiveNav("FLOATS")}
          className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>All {floats.length || 55} Active</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
