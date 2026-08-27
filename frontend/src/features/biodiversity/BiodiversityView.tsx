"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  BarChart3,
  FileText,
  GitCompare,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import { getBiodiversityObservations, getEcologicalProfiles, type BiodiversityObservation } from "@/lib/api/biodiversity";
import type { EcologicalProfile } from "@/types/biodiversity";

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

export function BiodiversityView() {
  const { biodiversity, selectedSpecies, setSelectedSpecies, setActiveNav, flyToCoordinates } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [profiles, setProfiles] = useState<EcologicalProfile[]>([]);
  const [observations, setObservations] = useState<BiodiversityObservation[]>([]);
  const [comparisonSpecies, setComparisonSpecies] = useState<string[]>([]);

  useEffect(() => {
    getEcologicalProfiles({ limit: 30000 })
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  const occurrenceIndex = useMemo(() => {
    const byName = new Map<string, { count: number; latitude: number; longitude: number; event_date: string }>();
    biodiversity.forEach((record) => {
      const key = record.scientific_name;
      const existing = byName.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byName.set(key, {
          count: 1,
          latitude: record.latitude,
          longitude: record.longitude,
          event_date: record.event_date,
        });
      }
    });
    return byName;
  }, [biodiversity]);

  const speciesCatalog = useMemo(() => {
    if (profiles.length > 0) {
      return profiles.map((profile, index) => {
        const occurrence = occurrenceIndex.get(profile.scientific_name);
        const aphiaToken = profile.aphia_id_lsid?.split("taxname:").pop();
        return {
          id: index + 1,
          scientific_name: profile.scientific_name,
          common_name: profile.common_name || profile.scientific_name,
          aphia_id: Number(aphiaToken || 0),
          kingdom: "Animalia",
          phylum: "Chordata",
          family: profile.family || "Marine Taxa",
          genus: profile.genus || undefined,
          latitude: occurrence?.latitude || 0,
          longitude: occurrence?.longitude || 0,
          depth_m: profile.depth_max_m,
          depth_min_m: profile.depth_min_m,
          event_date: occurrence?.event_date || "",
          thermal_range_min_c: profile.temp_pref_min_c,
          thermal_range_max_c: profile.temp_pref_max_c,
          salinity_min_psu: profile.salinity_min_psu,
          salinity_max_psu: profile.salinity_max_psu,
          hypoxia_avoidance_threshold_umol_kg: profile.hypoxia_avoidance_threshold_umol_kg,
          habitat_zone: profile.habitat_zone,
          ecological_response: profile.ecological_response,
          evidence_source: profile.evidence_source,
          institution_code: "CMLRE",
          occurrence_count: occurrence?.count || 0,
        };
      });
    }
    return biodiversity.map((record, index) => ({
      ...record,
      id: record.id || index + 1,
      occurrence_count: occurrenceIndex.get(record.scientific_name)?.count || 1,
    }));
  }, [biodiversity, occurrenceIndex, profiles]);

  const activeSpecies = useMemo(() => {
    return speciesCatalog.find((species) => species.scientific_name === selectedSpecies) || speciesCatalog[0];
  }, [selectedSpecies, speciesCatalog]);

  useEffect(() => {
    if (!activeSpecies?.scientific_name) return;
    getBiodiversityObservations(activeSpecies.scientific_name)
      .then(setObservations)
      .catch(() => setObservations([]));
  }, [activeSpecies?.scientific_name]);

  const activeDepthMin = activeSpecies && "depth_min_m" in activeSpecies ? activeSpecies.depth_min_m : undefined;
  const activeTempMin = activeSpecies?.thermal_range_min_c ?? 0;
  const activeTempMax = activeSpecies?.thermal_range_max_c ?? 0;

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

  useEffect(() => {
    if (activeSpecies && comparisonSpecies.length === 0) {
      setComparisonSpecies([activeSpecies.scientific_name]);
    }
  }, [activeSpecies, comparisonSpecies.length]);

  const profileAnalytics = useMemo(() => {
    const countBy = (values: Array<string | null | undefined>) =>
      Array.from(values.reduce((counts, value) => {
        const key = value?.trim() || "Unspecified";
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);

    const temperatureBuckets = ["0–12°C", "12–19°C", "18–26°C", "24–29.5°C", "Other"].map((label) => ({ label, count: 0 }));
    speciesCatalog.forEach((profile) => {
      const min = profile.thermal_range_min_c ?? 0;
      const max = profile.thermal_range_max_c ?? 0;
      const bucket = max <= 12 ? temperatureBuckets[0] : max <= 19 ? temperatureBuckets[1] : min >= 24 ? temperatureBuckets[3] : min >= 18 ? temperatureBuckets[2] : temperatureBuckets[4];
      bucket.count += 1;
    });

    return {
      habitats: countBy(speciesCatalog.map((profile) => ("habitat_zone" in profile ? profile.habitat_zone : null))).slice(0, 8),
      families: countBy(speciesCatalog.map((profile) => profile.family)).slice(0, 8),
      evidence: countBy(speciesCatalog.map((profile) => ("evidence_source" in profile ? profile.evidence_source : null))).slice(0, 6),
      temperatures: temperatureBuckets,
      complete: speciesCatalog.filter((profile) =>
        profile.family && profile.thermal_range_min_c != null && profile.thermal_range_max_c != null &&
        profile.salinity_min_psu != null && profile.salinity_max_psu != null &&
        ("ecological_response" in profile ? profile.ecological_response : null)
      ).length,
    };
  }, [speciesCatalog]);

  const comparedProfiles = useMemo(
    () => comparisonSpecies.map((name) => speciesCatalog.find((profile) => profile.scientific_name === name)).filter(Boolean),
    [comparisonSpecies, speciesCatalog]
  );

  const activeHabitat = activeSpecies && "habitat_zone" in activeSpecies ? activeSpecies.habitat_zone : null;
  const activeEvidence = activeSpecies && "evidence_source" in activeSpecies ? activeSpecies.evidence_source : null;
  const activeResponse = activeSpecies && "ecological_response" in activeSpecies ? activeSpecies.ecological_response : null;

  const renderAggregateBars = (items: Array<[string, number] | { label: string; count: number }>, color: string) => {
    const maxCount = Math.max(...items.map((item) => Array.isArray(item) ? item[1] : item.count), 1);
    return items.map((item) => {
      const label = Array.isArray(item) ? item[0] : item.label;
      const count = Array.isArray(item) ? item[1] : item.count;
      return (
        <div key={label} className="flex items-center gap-2 text-[10px]">
          <span className="w-28 truncate text-zinc-400" title={label}>{label}</span>
          <div className="h-2.5 flex-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="w-9 text-right font-bold text-white">{count.toLocaleString()}</span>
        </div>
      );
    });
  };

  const availableGraphs = useMemo(() => ({
    thermal: activeSpecies?.thermal_range_min_c != null && activeSpecies?.thermal_range_max_c != null,
    depth: activeDepthMin != null || activeSpecies?.depth_m != null,
    salinity: activeSpecies?.salinity_min_psu != null || activeSpecies?.salinity_max_psu != null,
    hypoxia: activeSpecies?.hypoxia_avoidance_threshold_umol_kg != null,
  }), [activeDepthMin, activeSpecies]);

  const hasOccurrenceData = observations.some((record) => record.latitude != null && record.longitude != null);

  const featuredSpecies = useMemo<FeaturedSpecies[]>(() => {
    if (!speciesCatalog.length) return [];
    const images = ["/assets/sardine_marine.png", "/assets/tuna_marine.png", "/assets/grouper_marine.png"];
    return [...speciesCatalog]
      .sort((a, b) => (("occurrence_count" in b ? b.occurrence_count : 0) as number) - (("occurrence_count" in a ? a.occurrence_count : 0) as number))
      .slice(0, 6)
      .map((species, index) => {
        const stressed = (species.thermal_range_max_c ?? 28) > 29;
        const count = "occurrence_count" in species ? Number(species.occurrence_count) : 0;
        return {
          category: `${species.family || "MARINE"} SPECIES`.toUpperCase(),
          categoryBadgeClass: stressed ? "bg-[#FB923C]/20 text-[#FB923C]" : "bg-[#2EE6C6]/20 text-[#2EE6C6]",
          badgeBg: stressed ? "rgba(251,146,60,0.2)" : "rgba(46,230,198,0.2)",
          badgeText: stressed ? "#fb923c" : "#2ee6c6",
          image: images[index % images.length],
          scientificName: species.scientific_name,
          commonName: species.common_name || "CMLRE marine record",
          taxonomy: `${species.phylum || "Chordata"} / ${species.family || "Marine Taxa"}`,
          optimalSst: `${species.thermal_range_min_c ?? "—"}°C – ${species.thermal_range_max_c ?? "—"}°C`,
          observedSst: `${count.toLocaleString()} occurrence records`,
          isAlert: stressed,
          statusText: stressed ? "Thermal range flagged" : "Cataloged species",
          statusColor: stressed ? "#fb923c" : "#2ee6c6",
          aiDiagnosis: count
            ? `${species.aphia_id ? `AphiaID #${species.aphia_id}` : "CMLRE occurrence"} · ${species.latitude.toFixed(2)}°N, ${species.longitude.toFixed(2)}°E`
            : "Ecological profile from the master catalog — no mapped occurrence yet",
          aiBoxClass: stressed ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
          aiTextClass: stressed ? "text-amber-300" : "text-emerald-300",
        };
      });
  }, [speciesCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = query
      ? speciesCatalog.filter((species) =>
          species.scientific_name.toLowerCase().includes(query) ||
          species.common_name.toLowerCase().includes(query) ||
          species.family.toLowerCase().includes(query)
        )
      : [...speciesCatalog].sort((a, b) => (("occurrence_count" in b ? b.occurrence_count : 0) as number) - (("occurrence_count" in a ? a.occurrence_count : 0) as number));
    return rows;
  }, [searchQuery, speciesCatalog]);

  const comparisonOptions = useMemo(
    () => [...speciesCatalog]
      .sort((a, b) => (("occurrence_count" in b ? b.occurrence_count : 0) as number) - (("occurrence_count" in a ? a.occurrence_count : 0) as number))
      .slice(0, 40),
    [speciesCatalog]
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold font-mono text-white tracking-wider flex items-center gap-2"><BarChart3 size={16} className="text-[#00FFC6]" /> PROFILE INTELLIGENCE</h2>
            <p className="text-[10px] text-[#8AB0C0] mt-1">Aggregated from the ecological profile master catalog</p>
          </div>
          <span className="text-[10px] font-mono text-[#2EE6C6]">{profiles.length > 0 ? `${speciesCatalog.length.toLocaleString()} unique taxa` : "Loading master profile catalog..."}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {[
            ["Profile taxa", speciesCatalog.length.toLocaleString(), "text-[#83FFE3]"],
            ["Families", new Set(speciesCatalog.map((profile) => profile.family)).size.toLocaleString(), "text-white"],
            ["Habitat zones", profileAnalytics.habitats.length.toLocaleString(), "text-[#60A5FA]"],
            ["Complete profiles", `${profileAnalytics.complete.toLocaleString()} / ${speciesCatalog.length.toLocaleString()}`, "text-[#4ADE80]"],
          ].map(([label, value, color]) => (
            <div key={label} className="p-3 rounded-xl bg-[#0B1D2C]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] text-[#809AAB] uppercase block">{label}</span>
              <span className={`text-xl font-bold block mt-1 ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-xs font-bold text-[#2EE6C6]">Habitat zones</span><span className="text-[10px] text-zinc-500">taxa</span></div>
            {renderAggregateBars(profileAnalytics.habitats, "#2EE6C6")}
          </div>
          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-xs font-bold text-[#60A5FA]">Family coverage</span><span className="text-[10px] text-zinc-500">taxa</span></div>
            {renderAggregateBars(profileAnalytics.families, "#60A5FA")}
          </div>
          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-xs font-bold text-[#FBBF24]">Evidence sources</span><span className="text-[10px] text-zinc-500">profiles</span></div>
            {renderAggregateBars(profileAnalytics.evidence, "#FBBF24")}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3"><span className="text-xs font-bold text-[#4ADE80]">Temperature preference distribution</span><span className="text-[10px] text-zinc-500">profile ranges</span></div>
            <div className="grid grid-cols-5 gap-2 items-end h-32">{profileAnalytics.temperatures.map((bucket) => <div key={bucket.label} className="h-full flex flex-col justify-end items-center gap-1"><span className="text-[9px] text-white">{bucket.count.toLocaleString()}</span><div className="w-full rounded-t bg-gradient-to-t from-[#4ADE80]/30 to-[#4ADE80]" style={{ height: `${Math.max(5, (bucket.count / Math.max(...profileAnalytics.temperatures.map((item) => item.count), 1)) * 100)}%` }} /><span className="text-[8px] text-zinc-500 text-center">{bucket.label}</span></div>)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3"><span className="text-xs font-bold text-[#C084FC]">Selected profile evidence</span><FileText size={14} className="text-[#C084FC]" /></div>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between gap-3"><span className="text-zinc-500">Habitat</span><span className="text-white text-right">{activeHabitat || "Unspecified"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-zinc-500">Evidence source</span><span className="text-[#83FFE3] text-right">{activeEvidence || "Unspecified"}</span></div>
              <p className="pt-2 border-t border-white/10 text-zinc-300 leading-relaxed max-h-20 overflow-y-auto">{activeResponse || "No ecological response text is available for this profile."}</p>
            </div>
          </div>
        </div>
      </section>

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
              ["Occurrence Records", (activeSpecies && "occurrence_count" in activeSpecies ? Number(activeSpecies.occurrence_count) : activeSpeciesRecords.length).toLocaleString(), "text-white"],
              ["Depth Range", activeDepthMin != null || activeSpecies.depth_m != null ? `${activeDepthMin ?? 0}–${activeSpecies.depth_m ?? ""} m` : "Unavailable", "text-white"],
              ["Thermal Envelope", activeTempMax ? `${activeTempMin}–${activeTempMax} °C` : "Unavailable", "text-[#4ADE80]"],
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
                  <div className="flex items-center gap-2 pt-12"><span className="w-10 text-[9px] text-zinc-500">Profile</span><div className="h-3 flex-1 rounded bg-[#2EE6C6]/15 relative"><span className="absolute h-full rounded bg-[#2EE6C6]" style={{ left: `${Math.max(0, (activeTempMin / 35) * 100)}%`, width: `${Math.max(4, ((activeTempMax - activeTempMin) / 35) * 100)}%` }} /></div></div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">Preferred temperature from ecological profile</div>
              </div>
            )}
            {availableGraphs.depth && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5"><TrendingUp size={13} /> Depth Distribution</span><span className="text-[10px] text-zinc-400">metres</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end gap-1">{observations.slice(0, 32).map((record, index) => <div key={record.occurrence_id || index} className="flex-1 min-w-[3px] rounded-t bg-[#38BDF8]" style={{ height: `${Math.max(8, 100 - Math.min(90, ((record.maximum_depth_m ?? record.minimum_depth_m ?? 0) / 50)))}%`, opacity: 0.45 + (index % 4) * 0.12 }} title={`${record.maximum_depth_m ?? record.minimum_depth_m ?? "-"}m`} />)}</div>
                <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>{activeDepthMin ?? 0}m</span><span className="text-[#38BDF8] font-bold">{observations.length.toLocaleString()} observations</span><span>{activeSpecies.depth_m ?? "Unavailable"}m</span></div>
              </div>
            )}
            {availableGraphs.salinity && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1.5"><Droplets size={13} /> Salinity Tolerance</span><span className="text-[10px] text-zinc-400">PSU</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 space-y-2 overflow-hidden"><div className="flex items-center gap-2 pt-12"><span className="w-10 text-[9px] text-zinc-500">Profile</span><div className="h-3 flex-1 rounded bg-[#60A5FA]/15 relative"><span className="absolute h-full rounded bg-[#60A5FA]" style={{ left: `${Math.max(0, ((activeSpecies.salinity_min_psu || 30) - 30) * 12.5)}%`, width: `${Math.max(4, ((activeSpecies.salinity_max_psu || 38) - (activeSpecies.salinity_min_psu || 30)) * 12.5)}%` }} /></div></div></div>
                <div className="text-[10px] text-zinc-400 mt-2">Measured tolerance bounds in CMLRE records</div>
              </div>
            )}
            {availableGraphs.hypoxia && (
              <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#FFA500] flex items-center gap-1.5"><Activity size={13} /> Hypoxia Threshold</span><span className="text-[10px] text-zinc-400">µmol/kg</span></div>
                <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end"><div className="w-full rounded-t bg-[#FFA500]" style={{ height: `${Math.min(100, ((activeSpecies.hypoxia_avoidance_threshold_umol_kg || 0) / 150) * 100)}%` }} /></div>
                <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>0</span><span className="text-[#FFA500] font-bold">{activeSpecies.hypoxia_avoidance_threshold_umol_kg} µmol/kg profile floor</span><span>150</span></div>
              </div>
            )}
            {hasOccurrenceData && <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5"><Compass size={13} /> Habitat Coordinates</span><span className="text-[10px] text-cyan-400">Spatial Join</span></div>
              <div className="h-44 bg-[#071A2D]/60 rounded-xl border border-white/5 relative overflow-hidden"><div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,#2EE6C6_1px,transparent_1px)] [background-size:16px_16px]" />{observations.slice(0, 80).map((record, index) => record.latitude != null && record.longitude != null && <span key={record.occurrence_id || index} className="absolute w-1.5 h-1.5 rounded-full bg-[#00FFC6] shadow-[0_0_7px_#00FFC6]" style={{ left: `${Math.min(95, Math.max(5, ((record.longitude + 180) / 360) * 100))}%`, top: `${Math.min(95, Math.max(5, ((90 - record.latitude) / 180) * 100))}%` }} />)}</div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>{observations.length} plotted</span><span className="text-[#83FFE3] font-bold">{activeSpecies.latitude.toFixed(2)}°N · {activeSpecies.longitude.toFixed(2)}°E</span></div>
            </div>}
            {hasOccurrenceData && <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2"><span className="text-xs font-bold text-[#FBBF24] flex items-center gap-1.5"><TrendingUp size={13} /> Occurrence Timeline</span><span className="text-[10px] text-zinc-400">event_date</span></div>
              <div className="h-44 bg-[#071A2D]/60 rounded-xl p-3 border border-white/5 flex items-end gap-1">{observations.slice(0, 32).map((record, index) => <div key={record.occurrence_id || index} className="flex-1 min-w-[3px] rounded-t bg-gradient-to-t from-[#2EE6C6]/30 to-[#00FFC6]" style={{ height: `${35 + ((new Date(record.event_date).getUTCMonth() + index) % 8) * 8}%` }} />)}</div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-2"><span>Historical</span><span className="text-[#FBBF24] font-bold">{observations.length.toLocaleString()} records</span><span>Latest</span></div>
            </div>}
          </div>

          <div className="p-4 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="text-xs font-bold text-[#83FFE3] flex items-center gap-1.5"><GitCompare size={14} /> Species comparison</span>
              <span className="text-[10px] text-zinc-500">Select up to 4 taxa</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {comparisonOptions.map((profile) => {
                const selected = comparisonSpecies.includes(profile.scientific_name);
                return (
                  <button
                    type="button"
                    key={profile.scientific_name}
                    onClick={() => setComparisonSpecies((current) => selected ? current.filter((name) => name !== profile.scientific_name) : current.length < 4 ? [...current, profile.scientific_name] : current)}
                    className={`px-2 py-1 rounded-lg border text-[10px] transition-colors ${selected ? "bg-[#2EE6C6]/20 border-[#2EE6C6] text-[#83FFE3]" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"}`}
                  >
                    {profile.scientific_name}
                  </button>
                );
              })}
            </div>
            {comparedProfiles.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[10px]">
                  <thead><tr className="border-b border-white/10 text-zinc-500 uppercase"><th className="py-2 pr-3">Taxon</th><th className="py-2 px-3">Habitat</th><th className="py-2 px-3">Depth</th><th className="py-2 px-3">Temp</th><th className="py-2 px-3">Salinity</th><th className="py-2 pl-3">Hypoxia floor</th></tr></thead>
                  <tbody>{comparedProfiles.map((profile) => profile && <tr key={profile.scientific_name} className="border-b border-white/5"><td className="py-2 pr-3 italic font-bold text-white">{profile.scientific_name}</td><td className="py-2 px-3 text-zinc-300">{"habitat_zone" in profile ? profile.habitat_zone || "-" : "-"}</td><td className="py-2 px-3 text-[#38BDF8]">{"depth_min_m" in profile ? `${profile.depth_min_m ?? 0}–${profile.depth_m ?? "-"}m` : "-"}</td><td className="py-2 px-3 text-[#4ADE80]">{profile.thermal_range_min_c ?? "-"}–{profile.thermal_range_max_c ?? "-"}°C</td><td className="py-2 px-3 text-[#60A5FA]">{profile.salinity_min_psu ?? "-"}–{profile.salinity_max_psu ?? "-"}</td><td className="py-2 pl-3 text-[#FFA500]">{profile.hypoxia_avoidance_threshold_umol_kg ?? "-"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
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
              CMLRE Marine Living Resources Catalog ({speciesCatalog.length ? speciesCatalog.length.toLocaleString() : "20,468"} taxa · {biodiversity.length ? biodiversity.length.toLocaleString() : "5,629"} occurrences)
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
              {filteredCatalog.slice(0, 25).map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 italic font-bold text-white">{b.scientific_name}</td>
                  <td className="py-2.5 px-3 text-[#D5E4F7]">{b.common_name}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{b.family || "Marine Taxa"}</td>
                  <td className="py-2.5 px-3 text-[#83FFE3]">{b.latitude ? `${b.latitude.toFixed(2)}°N, ${b.longitude.toFixed(2)}°E` : "No mapped point"}</td>
                  <td className="py-2.5 px-3 text-zinc-300">{b.depth_m != null ? `${b.depth_m}m` : "—"}</td>
                  <td className="py-2.5 px-3 text-[#4ADE80]">{b.thermal_range_min_c != null && b.thermal_range_max_c != null ? `${b.thermal_range_min_c}°C – ${b.thermal_range_max_c}°C` : "—"}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => {
                        setSelectedSpecies(b.scientific_name);
                        if (b.latitude && b.longitude) flyToCoordinates?.(b.latitude, b.longitude, 5);
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
