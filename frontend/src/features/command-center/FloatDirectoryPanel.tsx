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
    <div className="p-3 rounded-lg bg-[#121215] border border-white/[0.08] flex flex-col justify-between h-[235px] select-none text-xs">
      {/* ── 1. Header with Title, Badge & Search ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-zinc-200 text-xs truncate">
              Float Directory
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedFloatId && (
              <button
                onClick={() => setSelectedFloatId("")}
                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Deselect active float"
              >
                <span>Clear</span>
                <X size={10} />
              </button>
            )}
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-medium">
              {floats.length} active
            </span>
          </div>
        </div>

        {/* ── 2. Quick Search Box ─────────────────────────────────────────── */}
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by WMO # or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-6 py-1 bg-zinc-900/90 border border-white/[0.08] focus:border-zinc-600 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* ── 3. Scrollable Directory List ─────────────────────────────────── */}
        <div className="space-y-1 overflow-y-auto max-h-[92px] custom-scrollbar pr-1">
          {filteredFloats.length === 0 ? (
            <div className="text-center py-4 text-xs text-zinc-500">
              No platforms matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredFloats.map((f) => {
              const wmoStr = String(f.wmo_id);
              const isSelected = String(selectedFloatId) === wmoStr;

              return (
                <div
                  key={f.wmo_id}
                  onClick={() => handleFloatClick(wmoStr, f.last_lat, f.last_lon)}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-zinc-800 border border-zinc-600 text-zinc-100"
                      : "bg-zinc-900/40 hover:bg-zinc-800/60 border border-transparent text-zinc-300 hover:text-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 font-mono">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? "bg-blue-500" : "bg-zinc-600"
                      }`}
                    />
                    <span className="font-medium text-xs tracking-tight truncate">
                      WMO {wmoStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500 font-mono">
                    <span>
                      {f.last_lat.toFixed(1)}°N, {f.last_lon.toFixed(1)}°E
                    </span>
                    {isSelected ? (
                      <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium">
                        Selected
                      </span>
                    ) : (
                      <span>
                        {f.total_profiles || 100} casts
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 4. Bottom Quick Action Bar ────────────────────────────────────── */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs text-zinc-500">
        <span className="text-[11px] truncate">
          {selectedFloatId
            ? `Float #${selectedFloatId} selected`
            : "Click any float to inspect depth profile"}
        </span>
        <button
          onClick={() => setActiveNav("FLOATS")}
          className="text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1 shrink-0 cursor-pointer text-[11px]"
        >
          <span>Studio</span>
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}
