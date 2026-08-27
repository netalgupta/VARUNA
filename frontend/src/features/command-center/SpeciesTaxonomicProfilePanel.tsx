"use client";

import React, { useMemo } from "react";
import {
  Fish,
  Thermometer,
  Droplets,
  Layers,
  ShieldAlert,
  X,
  ChevronRight,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import type { BiodiversityRecord } from "@/types/biodiversity";

interface SpeciesTaxonomicProfilePanelProps {
  onDeselect?: () => void;
}

export function SpeciesTaxonomicProfilePanel({
  onDeselect,
}: SpeciesTaxonomicProfilePanelProps) {
  const {
    selectedBioRecord,
    selectedSpecies,
    biodiversity,
    setActiveNav,
  } = useOperationalState();

  // Find active record from selectedBioRecord or match by selectedSpecies
  const activeRecord: BiodiversityRecord = useMemo(() => {
    if (selectedBioRecord) return selectedBioRecord;
    const match = biodiversity.find(
      (b) =>
        b.scientific_name.toLowerCase() === selectedSpecies.toLowerCase() ||
        b.common_name.toLowerCase() === selectedSpecies.toLowerCase()
    );
    if (match) return match;
    return (
      biodiversity[0] || {
        id: 1,
        scientific_name: "Sardinella longiceps",
        common_name: "Indian Oil Sardine",
        aphia_id: 218659,
        kingdom: "Animalia",
        phylum: "Chordata",
        family: "Clupeidae",
        genus: "Sardinella",
        latitude: 15.42,
        longitude: 73.81,
        depth_m: 15.0,
        depth_min_m: 0.0,
        depth_max_m: 100.0,
        habitat_zone: "pelagic-neritic",
        ecological_response:
          "Marine taxa residing in pelagic-neritic zone across the Indian Ocean basin. Environmental tolerance limits: Preferred Temp 24.0–29.5 °C; Salinity 32.0–36.5 PSU; Hypoxia avoidance floor 60.0 µmol/kg.",
        evidence_source: "CMLRE / SeaLifeBase",
        event_date: "2024-04-14",
        thermal_range_min_c: 24.0,
        thermal_range_max_c: 29.5,
        salinity_min_psu: 32.0,
        salinity_max_psu: 36.5,
        hypoxia_avoidance_threshold_umol_kg: 60.0,
        dataset_type: "voucher",
        institution_code: "CMLRE",
      }
    );
  }, [selectedBioRecord, selectedSpecies, biodiversity]);

  const sName = activeRecord.scientific_name || selectedSpecies || "Marine Specimen";
  const hasDistinctCommon = Boolean(
    activeRecord.common_name &&
    activeRecord.common_name.trim().toLowerCase() !== sName.trim().toLowerCase()
  );
  const primaryTitle = hasDistinctCommon ? activeRecord.common_name : sName;
  const aphiaId = activeRecord.aphia_id || "WoRMS";
  const family = activeRecord.family || "Marine Taxa";
  const genus = activeRecord.genus || sName.split(" ")[0];
  const phylum = activeRecord.phylum || "Chordata";
  const kingdom = activeRecord.kingdom || "Animalia";
  const habitat = activeRecord.habitat_zone || "pelagic-neritic";
  const tMin = activeRecord.thermal_range_min_c != null ? Number(activeRecord.thermal_range_min_c).toFixed(1) : "22.0";
  const tMax = activeRecord.thermal_range_max_c != null ? Number(activeRecord.thermal_range_max_c).toFixed(1) : "28.0";
  const sMin = activeRecord.salinity_min_psu != null ? Number(activeRecord.salinity_min_psu).toFixed(1) : "32.0";
  const sMax = activeRecord.salinity_max_psu != null ? Number(activeRecord.salinity_max_psu).toFixed(1) : "36.5";
  const hypoxia = activeRecord.hypoxia_avoidance_threshold_umol_kg != null ? Number(activeRecord.hypoxia_avoidance_threshold_umol_kg).toFixed(0) : "45";
  const depthMin = activeRecord.depth_min_m != null ? `${Number(activeRecord.depth_min_m).toFixed(0)}m` : "0m";
  const depthMax = activeRecord.depth_max_m != null ? `${Number(activeRecord.depth_max_m).toFixed(0)}m` : (activeRecord.depth_m ? `${Number(activeRecord.depth_m).toFixed(0)}m` : "150m");
  const ecoNotes = activeRecord.ecological_response || `Marine organism (${family}) documented across the Indian Ocean basin with high ecological relevance.`;
  const evidence = activeRecord.evidence_source || "CMLRE / WoRMS";

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#08152c]/95 to-[#040c1a]/98 border border-emerald-500/30 backdrop-blur-md shadow-2xl flex flex-col justify-between h-full select-none relative transition-all">
      {/* ── 1. Top Header with Species Title & Deselect ─────────────────────── */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span className="font-mono font-bold text-emerald-300 text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Fish size={13} className="text-emerald-400" />
            Taxonomic & Ecological Profile
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
            AphiaID #{aphiaId}
          </span>
          {onDeselect && (
            <button
              onClick={onDeselect}
              className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors"
              title="Switch back to Float Probe"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Primary Identity: Deduplicated Common / Scientific Name ─────── */}
      <div className="my-1 shrink-0">
        <div className="text-lg font-bold text-white tracking-tight leading-tight truncate">
          {primaryTitle}
        </div>
        {hasDistinctCommon ? (
          <div className="text-xs font-mono text-emerald-400/90 italic font-medium truncate mt-0.5">
            {sName}
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
            Family: <span className="text-emerald-300 font-semibold">{family}</span> &nbsp;|&nbsp; Genus: <span className="text-cyan-300 italic">{genus}</span>
          </div>
        )}

        {/* Taxonomic Lineage Breadcrumbs */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-[#091e36] text-slate-300 border border-sky-500/20">
            {kingdom}
          </span>
          <span className="text-slate-500">›</span>
          <span className="px-1.5 py-0.5 rounded bg-[#091e36] text-slate-300 border border-sky-500/20">
            {phylum}
          </span>
          <span className="text-slate-500">›</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold">
            {family}
          </span>
          <span className="text-slate-500">›</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-semibold">
            {genus}
          </span>
        </div>
      </div>

      {/* ── 3. 4-Box Physical/Chemical Tolerance Envelopes ─────────────────── */}
      <div className="grid grid-cols-2 gap-2 my-1 shrink-0">
        {/* Thermal Window */}
        <div className="p-2 rounded-lg bg-[#071324]/80 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Thermometer size={11} />
              Thermal Optimum
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-white mt-1">
            {tMin} – {tMax} °C
          </div>
        </div>

        {/* Salinity Limit */}
        <div className="p-2 rounded-lg bg-[#071324]/80 border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <Droplets size={11} />
              Salinity Range
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-white mt-1">
            {sMin} – {sMax} PSU
          </div>
        </div>

        {/* Hypoxia Floor */}
        <div className="p-2 rounded-lg bg-[#071324]/80 border border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <ShieldAlert size={11} />
              Hypoxia Avoidance
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-white mt-1">
            ≥ {hypoxia} µmol/kg
          </div>
        </div>

        {/* Bathymetric Depth / Strata */}
        <div className="p-2 rounded-lg bg-[#071324]/80 border border-purple-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-purple-400 font-medium">
              <Layers size={11} />
              Depth & Strata
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-white mt-1 capitalize truncate">
            {depthMin}–{depthMax} ({habitat})
          </div>
        </div>
      </div>

      {/* ── 4. Biology & Ecological Response Excerpt ───────────────────────── */}
      <div className="p-2.5 rounded-lg bg-[#061120] border border-emerald-500/20 text-[11px] font-mono text-slate-300 leading-relaxed my-1 shrink-0">
        <span className="text-emerald-400 font-semibold">Ecological Context: </span>
        {ecoNotes}
      </div>

      {/* ── 5. Bottom Metadata & Explore Link (Locked at Bottom, Never Cropped) ─ */}
      <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span>Source: <b className="text-slate-200">{evidence}</b></span>
          <span>•</span>
          <span>Inst: <b className="text-emerald-300">{activeRecord.institution_code || "CMLRE"}</b></span>
        </div>

        <button
          onClick={() => setActiveNav("BIODIVERSITY")}
          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
        >
          <span>Catalog Explorer</span>
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}
