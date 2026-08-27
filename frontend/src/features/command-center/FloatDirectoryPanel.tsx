"use client";

import React, { useState, useMemo } from "react";
import {
  Radio,
  Search,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Compass,
  Fish,
  Layers,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import type { BiodiversityRecord } from "@/types/biodiversity";

export function FloatDirectoryPanel() {
  const {
    floats,
    biodiversity,
    selectedFloatId,
    setSelectedFloatId,
    selectedBioRecord,
    setSelectedBioRecord,
    selectedSpecies,
    setSelectedSpecies,
    selectedEntityType,
    setSelectedEntityType,
    setActiveNav,
    flyToCoordinates,
  } = useOperationalState();

  const [activeTab, setActiveTab] = useState<"FLOATS" | "BIODIVERSITY">(
    selectedEntityType === "BIODIVERSITY" ? "BIODIVERSITY" : "FLOATS"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Sync tab with external selection type changes
  React.useEffect(() => {
    if (selectedEntityType === "BIODIVERSITY") {
      setActiveTab("BIODIVERSITY");
    } else if (selectedEntityType === "FLOAT") {
      setActiveTab("FLOATS");
    }
  }, [selectedEntityType]);

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

  // Filter biodiversity occurrences by scientific name, common name, or family
  const filteredBio = useMemo(() => {
    if (!searchQuery.trim()) return biodiversity.slice(0, 100);
    const q = searchQuery.toLowerCase().trim();
    return biodiversity
      .filter((b) => {
        const sName = (b.scientific_name || "").toLowerCase();
        const cName = (b.common_name || "").toLowerCase();
        const fam = (b.family || "").toLowerCase();
        const gen = (b.genus || "").toLowerCase();
        return sName.includes(q) || cName.includes(q) || fam.includes(q) || gen.includes(q);
      })
      .slice(0, 100);
  }, [biodiversity, searchQuery]);

  const handleFloatClick = (wmoId: string, lat: number, lon: number) => {
    setSelectedFloatId(String(wmoId));
    setSelectedEntityType("FLOAT");
    flyToCoordinates?.(lat, lon, 2000000);
  };

  const handleBioClick = (record: BiodiversityRecord) => {
    setSelectedBioRecord(record);
    setSelectedSpecies(record.scientific_name);
    setSelectedEntityType("BIODIVERSITY");
    const lat = Number(record.latitude ?? 10.0);
    const lon = Number(record.longitude ?? 75.0);
    flyToCoordinates?.(lat, lon, 2500000);
  };

  const toggleTab = (tab: "FLOATS" | "BIODIVERSITY") => {
    setActiveTab(tab);
    setSelectedEntityType(tab === "FLOATS" ? "FLOAT" : "BIODIVERSITY");
    setSearchQuery("");
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/90 to-[#040c1a]/95 border border-sky-500/20 backdrop-blur-md flex flex-col justify-between h-full select-none shadow-xl">
      {/* ── 1. Header with Tab Switcher & View All ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 mb-2">
          {/* Segmented Tab / Arrow Switcher */}
          <div className="flex items-center gap-1 bg-[#050e1c] p-0.5 rounded-lg border border-sky-500/20">
            <button
              onClick={() => toggleTab("FLOATS")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === "FLOATS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Radio size={10} className={activeTab === "FLOATS" ? "text-cyan-400 animate-pulse" : "text-slate-500"} />
              <span>Floats ({floats.length || 55})</span>
            </button>

            <button
              onClick={() => toggleTab("BIODIVERSITY")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === "BIODIVERSITY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Fish size={10} className={activeTab === "BIODIVERSITY" ? "text-emerald-400" : "text-slate-500"} />
              <span>Bio ({biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"})</span>
            </button>
          </div>

          {/* View All Navigation */}
          <button
            onClick={() => setActiveNav(activeTab === "FLOATS" ? "FLOATS" : "BIODIVERSITY")}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            View All
          </button>
        </div>

        {/* ── Search Input ─────────────────────────────────────────────────── */}
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "FLOATS"
                ? "Search 55 floats by WMO or lat/lon..."
                : "Search species by name, family, or genus..."
            }
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
          {activeTab === "FLOATS" ? (
            // ── A. FLOATS LIST ──
            filteredFloats.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-400 font-mono">
                No floats matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredFloats.map((f) => {
                const isSelected = selectedEntityType === "FLOAT" && String(selectedFloatId) === String(f.wmo_id);
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
                          isSelected ? "bg-white shadow-[0_0_8px_#ffffff]" : "bg-cyan-400 shadow-[0_0_4px_#00e5ff]"
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
            )
          ) : (
            // ── B. BIODIVERSITY SPECIES LIST ──
            filteredBio.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-400 font-mono">
                No species matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredBio.map((b) => {
                const isSelected =
                  selectedEntityType === "BIODIVERSITY" &&
                  ((selectedBioRecord && selectedBioRecord.id === b.id) ||
                    (!selectedBioRecord && selectedSpecies.toLowerCase() === b.scientific_name.toLowerCase()));
                const displayName = b.common_name && b.common_name !== b.scientific_name ? b.common_name : b.scientific_name;
                return (
                  <div
                    key={b.id || b.occurrence_id || b.scientific_name}
                    onClick={() => handleBioClick(b)}
                    className={`px-2.5 py-1 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-600/90 to-teal-700/90 border-emerald-400/50 text-white shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                        : "bg-[#071324]/60 border-transparent hover:border-emerald-500/25 hover:bg-[#0a1b34]/70 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isSelected ? "bg-white shadow-[0_0_8px_#ffffff]" : "bg-emerald-400 shadow-[0_0_4px_#34d399]"
                        }`}
                      />
                      <span className={`font-mono text-xs font-bold ${isSelected ? "text-white" : "text-slate-200"} truncate`}>
                        {displayName}
                      </span>
                      <span className={`text-[10px] font-mono ${isSelected ? "text-emerald-100" : "text-slate-400"} italic truncate`}>
                        {b.family}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-mono ${isSelected ? "text-emerald-100 font-semibold" : "text-slate-400"}`}>
                        {b.depth_m != null ? `${Number(b.depth_m).toFixed(0)}m` : "Pelagic"}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* ── 3. Bottom Footer Link ─────────────────────────────────────────── */}
      <div className="pt-2 border-t border-sky-500/15 flex items-center justify-between text-xs">
        <button
          onClick={() => toggleTab(activeTab === "FLOATS" ? "BIODIVERSITY" : "FLOATS")}
          className="text-slate-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors text-[11px] font-mono"
        >
          <ChevronLeft size={11} />
          <span>Switch to {activeTab === "FLOATS" ? "Biodiversity" : "Floats"}</span>
          <ChevronRight size={11} />
        </button>

        <button
          onClick={() => setActiveNav(activeTab === "FLOATS" ? "FLOATS" : "BIODIVERSITY")}
          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 cursor-pointer transition-colors text-[11px]"
        >
          <span>Catalog</span>
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}
