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
    <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#0d1b32]/85 to-[#081222]/90 border border-sky-500/20 backdrop-blur-md flex flex-col justify-between h-[235px] select-none shadow-lg">
      {/* ── 1. Header with Title, Badge & Search ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-white text-sm truncate">
              Float Directory
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedFloatId && (
              <button
                onClick={() => setSelectedFloatId("")}
                className="px-2 py-0.5 rounded-md bg-[#0e1c36] hover:bg-[#142646] text-sky-300 border border-sky-500/25 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Deselect active float"
              >
                <span>Clear</span>
                <X size={11} />
              </button>
            )}
            <span className="px-2 py-0.5 rounded-md bg-[#0e1c36] text-sky-300 border border-sky-500/20 text-xs font-medium">
              {floats.length} active
            </span>
          </div>
        </div>

        {/* ── 2. Quick Search Box ─────────────────────────────────────────── */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400/70" />
          <input
            type="text"
            placeholder="Search by WMO # or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-[#081222]/90 border border-sky-500/20 focus:border-sky-400/60 rounded-md text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* ── 3. Scrollable Directory List ─────────────────────────────────── */}
        <div className="space-y-1 overflow-y-auto max-h-[88px] custom-scrollbar pr-1">
          {filteredFloats.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No platforms matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredFloats.map((f) => {
              const isSelected = String(selectedFloatId) === String(f.wmo_id);
              return (
                <div
                  key={f.wmo_id}
                  onClick={() => handleFloatClick(String(f.wmo_id), f.last_lat, f.last_lon)}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-sky-500/25 border-sky-400/60 text-white shadow-[0_0_10px_rgba(56,189,248,0.15)]"
                      : "bg-[#0a1426]/70 border-transparent hover:border-sky-500/25 hover:bg-[#0e1c36]/70 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? "bg-sky-300 shadow-[0_0_6px_#38bdf8]" : "bg-emerald-400 shadow-[0_0_4px_#34d399]"
                      }`}
                    />
                    <span className="font-mono text-xs font-semibold text-white truncate">
                      WMO {f.wmo_id}
                    </span>
                    <span className="text-xs text-slate-300 hidden sm:inline truncate">
                      {f.last_lat.toFixed(1)}°N, {f.last_lon.toFixed(1)}°E
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-300">
                    {isSelected ? (
                      <span className="text-xs text-sky-300 font-semibold bg-sky-500/20 px-1.5 py-0.2 rounded border border-sky-400/30">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        {f.total_profiles || 280} casts
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 4. Bottom Footer Info ─────────────────────────────────────────── */}
      <div className="pt-2 border-t border-sky-500/15 flex items-center justify-between text-xs text-slate-300">
        <span className="truncate">
          {selectedFloatId ? `Selected: WMO ${selectedFloatId}` : "Click any float to select"}
        </span>
        <button
          onClick={() => setActiveNav("FLOATS")}
          className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5 cursor-pointer transition-colors"
        >
          <span>All ({floats.length})</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
