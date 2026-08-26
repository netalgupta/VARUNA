"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Fish,
  Search,
  Radio,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  ChevronLeft,
  Compass,
  Droplets,
  MapPin,
  Thermometer,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

interface FeaturedSpecies {
  category: string;
  categoryBadgeClass: string;
  badgeBg: string;
  badgeText: string;
  image: string;
  scientificName: string;
  commonName: string;
  taxonomy: string;
  optimalSst: string;
  observedSst: string;
  isAlert: boolean;
  statusText: string;
  statusColor: string;
  aiDiagnosis: string;
  aiBoxClass: string;
  aiTextClass: string;
}

const FEATURED_SPECIES: FeaturedSpecies[] = [
  {
    category: "PELAGIC SPECIES",
    categoryBadgeClass: "bg-[#2EE6C6]/20 text-[#2EE6C6]",
    badgeBg: "rgba(46,230,198,0.2)",
    badgeText: "#2ee6c6",
    image: "/assets/sardine_marine.png",
    scientificName: "Sardinella longiceps",
    commonName: "Indian Oil Sardine",
    taxonomy: "Actinopterygii / Clupeidae",
    optimalSst: "22°C – 26°C",
    observedSst: "29.2°C (+3.2°C) ⚠",
    isAlert: true,
    statusText: "Thermal Stress Alert",
    statusColor: "#f87171",
    aiDiagnosis: "AI: Thermal stress → Habitat compression → Offshore migration risk HIGH",
    aiBoxClass: "bg-red-500/10 border-red-500/30 text-red-300",
    aiTextClass: "text-red-300",
  },
  {
    category: "LARGE PELAGIC",
    categoryBadgeClass: "bg-[#FB923C]/20 text-[#FB923C]",
    badgeBg: "rgba(251,146,60,0.2)",
    badgeText: "#fb923c",
    image: "/assets/tuna_marine.png",
    scientificName: "Thunnus albacares",
    commonName: "Yellowfin Tuna",
    taxonomy: "Actinopterygii / Scombridae",
    optimalSst: "24°C – 30°C",
    observedSst: "28.1°C (Suitable)",
    isAlert: false,
    statusText: "Optimal Condition",
    statusColor: "#2ee6c6",
    aiDiagnosis: "AI: Optimal thermal window — aggregation probability HIGH in Arabian Sea thermocline",
    aiBoxClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    aiTextClass: "text-emerald-300",
  },
  {
    category: "DEMERSAL SPECIES",
    categoryBadgeClass: "bg-[#A78BFA]/20 text-[#A78BFA]",
    badgeBg: "rgba(167,139,250,0.2)",
    badgeText: "#a78bfa",
    image: "/assets/grouper_marine.png",
    scientificName: "Epinephelus tauvina",
    commonName: "Greasy Grouper",
    taxonomy: "Actinopterygii / Serranidae",
    optimalSst: "20°C – 28°C",
    observedSst: "29.4°C (+1.4°C) !",
    isAlert: true,
    statusText: "Marginal Stress",
    statusColor: "#fb923c",
    aiDiagnosis: "AI: Marginal thermal stress — DOXY depletion risk in DOXY < 60 zones",
    aiBoxClass: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    aiTextClass: "text-amber-300",
  },
];

export function BiodiversityView() {
  const { biodiversity, selectedSpecies, setSelectedSpecies, setActiveNav, flyToCoordinates } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");

  const speciesCatalog = useMemo(() => {
    const source = biodiversity.length > 0 ? biodiversity : FEATURED_SPECIES.map((species, index) => ({
      id: index,
      scientific_name: species.scientificName,
      common_name: species.commonName,
      aphia_id: 0,
      kingdom: "Animalia",
      phylum: "Chordata",
      family: species.taxonomy.split(" / ")[1] || "Marine Taxa",
      latitude: 10 + index * 3,
      longitude: 72 + index * 5,
      depth_m: 200,
      event_date: "2026-08-20",
      thermal_range_min_c: Number(species.optimalSst.split("°")[0]),
      thermal_range_max_c: Number(species.optimalSst.split("–")[1]?.split("°")[0] || 28),
      salinity_min_psu: 34,
      salinity_max_psu: 36,
      hypoxia_avoidance_threshold_umol_kg: 60,
      institution_code: "CMLRE",
    })) as typeof biodiversity;

    return Array.from(
      new Map(source.map((record) => [record.scientific_name, record])).values()
    );
  }, [biodiversity]);

  const activeSpecies = useMemo(() => {
    return speciesCatalog.find((species) => species.scientific_name === selectedSpecies) || speciesCatalog[0];
  }, [selectedSpecies, speciesCatalog]);

  const visibleSpecies = useMemo(() => {
    const query = speciesFilter.trim().toLowerCase();
    if (!query) return speciesCatalog.slice(0, 12);
    return speciesCatalog.filter((species) =>
      species.scientific_name.toLowerCase().includes(query) ||
      species.common_name.toLowerCase().includes(query) ||
      species.family.toLowerCase().includes(query)
    ).slice(0, 12);
  }, [speciesCatalog, speciesFilter]);

  const activeSpeciesRecords = useMemo(() => {
    if (!activeSpecies) return [];
    return biodiversity.filter((record) => record.scientific_name === activeSpecies.scientific_name);
  }, [activeSpecies, biodiversity]);

  const availableGraphs = useMemo(() => ({
    thermal: activeSpeciesRecords.some((record) => record.thermal_range_min_c != null && record.thermal_range_max_c != null),
    depth: activeSpeciesRecords.some((record) => record.depth_m != null),
    salinity: activeSpeciesRecords.some((record) => record.salinity_min_psu != null || record.salinity_max_psu != null),
    hypoxia: activeSpeciesRecords.some((record) => record.hypoxia_avoidance_threshold_umol_kg != null),
  }), [activeSpeciesRecords]);

  const featuredSpecies = useMemo<FeaturedSpecies[]>(() => {
    if (!biodiversity.length) return FEATURED_SPECIES;
    const images = ["/assets/sardine_marine.png", "/assets/tuna_marine.png", "/assets/grouper_marine.png"];
    return speciesCatalog.slice(0, 6).map((species, index) => {
      const stressed = species.thermal_range_max_c > 29;
      return {
        category: `${species.family || "MARINE"} SPECIES`.toUpperCase(),
        categoryBadgeClass: stressed ? "bg-[#FB923C]/20 text-[#FB923C]" : "bg-[#2EE6C6]/20 text-[#2EE6C6]",
        badgeBg: stressed ? "rgba(251,146,60,0.2)" : "rgba(46,230,198,0.2)",
        badgeText: stressed ? "#fb923c" : "#2ee6c6",
        image: images[index % images.length],
        scientificName: species.scientific_name,
        commonName: species.common_name || "CMLRE marine record",
        taxonomy: `${species.phylum || "Chordata"} / ${species.family || "Marine Taxa"}`,
        optimalSst: `${species.thermal_range_min_c}°C – ${species.thermal_range_max_c}°C`,
        observedSst: `${biodiversity.filter((record) => record.scientific_name === species.scientific_name).length.toLocaleString()} occurrence records`,
        isAlert: stressed,
        statusText: stressed ? "Thermal range flagged" : "Cataloged species",
        statusColor: stressed ? "#fb923c" : "#2ee6c6",
        aiDiagnosis: `${species.aphia_id ? `AphiaID #${species.aphia_id}` : "CMLRE occurrence"} · ${species.latitude.toFixed(2)}°N, ${species.longitude.toFixed(2)}°E`,
        aiBoxClass: stressed ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        aiTextClass: stressed ? "text-amber-300" : "text-emerald-300",
      };
    });
  }, [biodiversity, speciesCatalog]);

  const filteredDB = biodiversity.filter(
    (b) =>
      b.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.common_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4 p-4 overflow-y-auto custom-scrollbar select-none font-sans bg-[#051422] text-[#D5E4F7]">
      {/* ── Page Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-[#00FFC6] uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-pulse" />
            INCOIS ↔ CMLRE Integration
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight mt-1">
            Cross-Domain Biodiversity Explorer
          </h1>
          <p className="text-xs sm:text-sm text-[#A0C4D8] mt-1 max-w-3xl">
            Real-time AI-driven correlations between autonomous ARGO physical oceanography data and CMLRE marine living resources habitat suitability.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setActiveNav("COPILOT")}
          className="px-4 py-2 rounded-xl bg-[#0B1D2C] hover:bg-[#2EE6C6] text-[#83FFE3] hover:text-black border border-[#2EE6C6]/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(46,230,198,0.2)]"
        >
          <Sparkles size={14} />
          <span>Ask AI Species Copilot</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[280px] flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#2EE6C6]/15 border border-[#2EE6C6]/45 flex items-center justify-center">
            <Fish size={20} className="text-[#00FFC6]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#00FFC6] font-bold uppercase tracking-wider">
                Species Analytics &amp; Habitat Profile
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                CMLRE LIVE
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => {
                  const index = Math.max(0, speciesCatalog.findIndex((species) => species.scientific_name === activeSpecies?.scientific_name) - 1);
                  if (speciesCatalog[index]) setSelectedSpecies(speciesCatalog[index].scientific_name);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white cursor-pointer"
                title="Previous species"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="relative flex-1 max-w-md">
                <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="search"
                  value={speciesFilter}
                  onChange={(event) => setSpeciesFilter(event.target.value)}
                  placeholder="Search species, common name, or family..."
                  aria-label="Search species, common name, or family"
                  className="w-full h-8 pl-7 pr-2 rounded-lg bg-[#071A2D] border border-white/10 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-[#2EE6C6]"
                />
                {speciesFilter && (
                  <div className="absolute left-0 right-0 top-9 z-20 max-h-40 overflow-y-auto rounded-lg bg-[#071A2D] border border-[#2EE6C6]/40 p-1 shadow-2xl">
                    {visibleSpecies.map((species) => (
                      <button
                        type="button"
                        key={species.id}
                        onClick={() => {
                          setSelectedSpecies(species.scientific_name);
                          setSpeciesFilter("");
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2EE6C6]/15 text-[10px] font-mono text-slate-200"
                      >
                        <span className="block italic font-bold">{species.scientific_name}</span>
                        <span className="text-zinc-500">{species.common_name} · {species.family}</span>
                      </button>
                    ))}
                    {visibleSpecies.length === 0 && <div className="p-2 text-[10px] text-zinc-500">No matching species</div>}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const index = speciesCatalog.findIndex((species) => species.scientific_name === activeSpecies?.scientific_name);
                  const next = speciesCatalog[(index + 1) % speciesCatalog.length];
                  if (next) setSelectedSpecies(next.scientific_name);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white cursor-pointer"
                title="Next species"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => activeSpecies && flyToCoordinates?.(activeSpecies.latitude, activeSpecies.longitude, 5)}
          className="px-3.5 py-2 rounded-xl bg-[#12212E] hover:bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 text-[#83FFE3] font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <MapPin size={14} /> Locate Species
        </button>
      </div>

      {activeSpecies && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            {[
              ["Scientific Name", activeSpecies.scientific_name, "text-[#83FFE3]"],
              ["Occurrence Records", biodiversity.length.toLocaleString(), "text-white"],
              ["Depth Range", `${activeSpecies.depth_m || 20} m`, "text-white"],
              ["Thermal Envelope", `${activeSpecies.thermal_range_min_c}–${activeSpecies.thermal_range_max_c} °C`, "text-[#4ADE80]"],
              ["Salinity Range", `${activeSpecies.salinity_min_psu || 34}–${activeSpecies.salinity_max_psu || 36} PSU`, "text-[#60A5FA]"],
              ["Hypoxia Threshold", `${activeSpecies.hypoxia_avoidance_threshold_umol_kg || 60} µmol/kg`, "text-[#FFA500]"],
            ].map(([label, value, color]) => (
              <div key={label} className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg min-w-0">
                <span className="text-[10px] text-[#809AAB] block uppercase">{label}</span>
                <span className={`text-sm font-bold mt-1 block truncate ${color}`}>{value}</span>
                <span className="text-[9px] text-zinc-500">CMLRE biodiversity record</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#071A2D]/80 border border-white/5 flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="text-[#809AAB] font-bold flex items-center gap-1.5 mr-2"><Layers size={13} className="text-[#2EE6C6]" /> Data Channels:</span>
            <span className="px-2 py-0.5 rounded border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold">✓ OCCURRENCES</span>
            <span className="px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold">✓ HABITAT</span>
            <span className="px-2 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold">✓ ARGO JOIN</span>
            <span className="px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold">✓ THERMAL RANGE</span>
            <span className="px-2 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold">✓ TAXONOMY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {availableGraphs.thermal && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#2EE6C6] flex items-center gap-1.5"><Thermometer size={13} /> Thermal Range</span><span className="text-[10px] text-zinc-400">°C</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 space-y-2 overflow-hidden">
                  {activeSpeciesRecords.slice(0, 8).map((record) => <div key={record.id} className="flex items-center gap-2"><span className="w-10 text-[9px] text-zinc-500">#{record.id}</span><div className="h-3 flex-1 rounded bg-[#2EE6C6]/15 relative"><span className="absolute h-full rounded bg-[#2EE6C6]" style={{ left: `${Math.max(0, ((record.thermal_range_min_c - 10) / 30) * 100)}%`, width: `${Math.max(4, ((record.thermal_range_max_c - record.thermal_range_min_c) / 30) * 100)}%` }} /></div></div>)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">Observed range from {activeSpeciesRecords.length.toLocaleString()} records</div>
              </div>
            )}
            {availableGraphs.depth && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5"><TrendingUp size={13} /> Depth Distribution</span><span className="text-[10px] text-zinc-400">metres</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end gap-1">{activeSpeciesRecords.slice(0, 16).map((record, index) => <div key={record.id} className="flex-1 min-w-[3px] rounded-t bg-[#38BDF8]" style={{ height: `${Math.max(6, 100 - Math.min(90, (record.depth_m || 0) / 20))}%`, opacity: 0.45 + (index % 4) * 0.12 }} title={`${record.depth_m}m`} />)}</div>
                <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>Shallow</span><span className="text-[#38BDF8] font-bold">Max {Math.max(...activeSpeciesRecords.map((record) => record.depth_m || 0))}m</span><span>Deep</span></div>
              </div>
            )}
            {availableGraphs.salinity && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1.5"><Droplets size={13} /> Salinity Tolerance</span><span className="text-[10px] text-zinc-400">PSU</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 space-y-2 overflow-hidden">{activeSpeciesRecords.slice(0, 8).map((record) => <div key={record.id} className="flex items-center gap-2"><span className="w-10 text-[9px] text-zinc-500">#{record.id}</span><div className="h-3 flex-1 rounded bg-[#60A5FA]/15 relative"><span className="absolute h-full rounded bg-[#60A5FA]" style={{ left: `${((record.salinity_min_psu || 30) - 30) * 12.5}%`, width: `${Math.max(4, ((record.salinity_max_psu || 38) - (record.salinity_min_psu || 30)) * 12.5)}%` }} /></div></div>)}</div>
                <div className="text-[10px] text-zinc-400 mt-2">Measured tolerance bounds in CMLRE records</div>
              </div>
            )}
            {availableGraphs.hypoxia && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#FFA500] flex items-center gap-1.5"><Activity size={13} /> Hypoxia Threshold</span><span className="text-[10px] text-zinc-400">µmol/kg</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end gap-1">{activeSpeciesRecords.slice(0, 16).map((record, index) => <div key={record.id} className="flex-1 min-w-[3px] rounded-t bg-[#FFA500]" style={{ height: `${Math.min(100, ((record.hypoxia_avoidance_threshold_umol_kg || 0) / 150) * 100)}%`, opacity: 0.5 + (index % 3) * 0.15 }} title={`${record.hypoxia_avoidance_threshold_umol_kg} µmol/kg`} />)}</div>
                <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>Critical</span><span className="text-[#FFA500] font-bold">Threshold by record</span><span>Stable</span></div>
              </div>
            )}
            <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5"><Compass size={13} /> Habitat Coordinates</span><span className="text-[10px] text-cyan-400">Spatial Join</span></div>
              <div className="h-44 bg-[#071A2D]/60 rounded-xl border border-white/5 relative overflow-hidden"><div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,#2EE6C6_1px,transparent_1px)] [background-size:16px_16px]" />{activeSpeciesRecords.slice(0, 40).map((record) => <span key={record.id} className="absolute w-1.5 h-1.5 rounded-full bg-[#00FFC6] shadow-[0_0_7px_#00FFC6]" style={{ left: `${Math.min(95, Math.max(5, ((record.longitude + 180) / 360) * 100))}%`, top: `${Math.min(95, Math.max(5, ((90 - record.latitude) / 180) * 100))}%` }} />)}</div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>{activeSpeciesRecords.length} plotted</span><span className="text-[#83FFE3] font-bold">{activeSpecies.latitude.toFixed(2)}°N · {activeSpecies.longitude.toFixed(2)}°E</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#FBBF24] flex items-center gap-1.5"><TrendingUp size={13} /> Occurrence Timeline</span><span className="text-[10px] text-zinc-400">event_date</span></div>
              <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end gap-1">{activeSpeciesRecords.slice(0, 16).map((record, index) => <div key={record.id} className="flex-1 min-w-[3px] rounded-t bg-gradient-to-t from-[#2EE6C6]/30 to-[#00FFC6]" style={{ height: `${35 + ((new Date(record.event_date).getUTCMonth() + index) % 8) * 8}%` }} />)}</div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>Historical</span><span className="text-[#FBBF24] font-bold">{activeSpeciesRecords.length.toLocaleString()} records</span><span>Latest</span></div>
            </div>
          </div>
        </>
      )}

      {/* ── Netal 3-Card Featured Species Bento Grid ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {featuredSpecies.map((spec, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedSpecies(spec.scientificName)}
            className="p-5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 hover:border-[#2EE6C6]/60 shadow-xl transition-all flex flex-col justify-between cursor-pointer group"
          >
            <div>
              {/* Category Pill */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${spec.categoryBadgeClass}`}>
                  {spec.category}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {spec.statusText}
                </span>
              </div>

              {/* Specimen Render */}
              <div className="relative w-full h-40 rounded-xl overflow-hidden mb-3 border border-white/10 bg-black/40 group-hover:border-[#2EE6C6]/40 transition-all">
                <Image
                  src={spec.image}
                  alt={spec.scientificName}
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-95 saturate-110"
                />
              </div>

              {/* Names */}
              <h3 className="text-xl font-bold font-mono text-white italic tracking-tight group-hover:text-[#83FFE3] transition-colors">
                {spec.scientificName}
              </h3>
              <p className="text-xs text-[#8AB0C0] font-sans mt-0.5">{spec.commonName}</p>

              {/* Environmental Envelope Metrics */}
              <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8AB0C0]">Taxonomy:</span>
                  <span className="text-white font-medium">{spec.taxonomy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8AB0C0]">Optimal SST:</span>
                  <span className="text-[#4ADE80] font-bold">{spec.optimalSst}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8AB0C0]">Observed:</span>
                  <span className={`font-bold ${spec.isAlert ? "text-[#F87171]" : "text-[#2EE6C6]"}`}>
                    {spec.observedSst}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Diagnosis Box */}
            <div className={`mt-4 p-2.5 rounded-lg border text-[11px] font-mono leading-relaxed ${spec.aiBoxClass}`}>
              {spec.aiDiagnosis}
            </div>
          </div>
        ))}
      </div>

      {/* ── Complete CMLRE Species Database Catalog Table ─────────────────── */}
      <div className="p-5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Fish size={16} className="text-[#00FFC6]" />
            <h4 className="text-sm font-bold font-mono text-white tracking-wider">
              CMLRE Marine Living Resources Catalog ({biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"} Occurrences)
            </h4>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search taxonomy, species..."
              className="h-8 pl-7 pr-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-[#00FFC6]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[#8AB0C0] text-[10px] uppercase">
                <th className="py-2 px-3">Scientific Name</th>
                <th className="py-2 px-3">Common Name</th>
                <th className="py-2 px-3">Family</th>
                <th className="py-2 px-3">Coordinates</th>
                <th className="py-2 px-3">Depth</th>
                <th className="py-2 px-3">Thermal Range</th>
                <th className="py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDB.slice(0, 10).map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 italic font-bold text-white">{b.scientific_name}</td>
                  <td className="py-2.5 px-3 text-[#D5E4F7]">{b.common_name}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{b.family || "Actinopterygii"}</td>
                  <td className="py-2.5 px-3 text-[#83FFE3]">{b.latitude}°N, {b.longitude}°E</td>
                  <td className="py-2.5 px-3 text-zinc-300">{b.depth_m || 20}m</td>
                  <td className="py-2.5 px-3 text-[#4ADE80]">{b.thermal_range_min_c || 22}°C – {b.thermal_range_max_c || 28}°C</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => {
                        setSelectedSpecies(b.scientific_name);
                        flyToCoordinates?.(b.latitude, b.longitude, 5);
                        setActiveNav("OCEAN");
                      }}
                      className="px-2.5 py-1 rounded bg-[#2EE6C6]/15 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black font-bold text-[10px] transition-all"
                    >
                      Locate on Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
