"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Fish,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Radio,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

const SPECIES_PRESETS = [
  {
    name: "Sardinella longiceps",
    common: "Indian Oil Sardine",
    family: "Clupeidae",
    kingdom: "Animalia",
    phylum: "Chordata",
    class: "Actinopterygii",
    distribution: "Indian Ocean",
    optSst: "22°C - 26°C",
    currSst: "29.2°C",
    sstDelta: "+3.2°C",
    doxyRange: "> 60 µmol/kg",
    salinity: "33 - 37 PSU",
    diagnosis: "Thermal stress outside tolerance → Habitat compression → Migration offshore",
  },
  {
    name: "Rastrelliger kanagurta",
    common: "Indian Mackerel",
    family: "Scombridae",
    kingdom: "Animalia",
    phylum: "Chordata",
    class: "Actinopterygii",
    distribution: "Arabian Sea & BoB",
    optSst: "24°C - 27°C",
    currSst: "30.1°C",
    sstDelta: "+3.1°C",
    doxyRange: "> 75 µmol/kg",
    salinity: "34 - 36 PSU",
    diagnosis: "Surface layer warming → Poleward migration towards Gujarat shelf",
  },
  {
    name: "Acropora millepora",
    common: "Staghorn Coral",
    family: "Acroporidae",
    kingdom: "Animalia",
    phylum: "Cnidaria",
    class: "Anthozoa",
    distribution: "Gulf of Mannar",
    optSst: "24°C - 28°C",
    currSst: "32.1°C",
    sstDelta: "+3.6°C",
    doxyRange: "> 90 µmol/kg",
    salinity: "32 - 35 PSU",
    diagnosis: "Critical degree heating weeks (DHW 8.4) → Severe bleaching risk (85%)",
  },
];

export function CrossDomainExplorer() {
  const {
    selectedSpecies,
    setSelectedSpecies,
    correlations,
    setSelectedFloatId,
    flyToCoordinates,
  } = useOperationalState();

  const [activeTab, setActiveTab] = useState<
    "Explorer" | "Species Profile" | "Environmental Envelope" | "Correlations" | "Impact Assessment"
  >("Explorer");

  const [searchQuery, setSearchQuery] = useState("");

  const currentSpecies =
    SPECIES_PRESETS.find((s) => s.name.toLowerCase() === selectedSpecies.toLowerCase()) ||
    SPECIES_PRESETS[0];

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none">
      {/* ── Header & Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 mb-3 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Fish size={12} className="text-[#00FFC6]" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            INCOIS ⇄ CMLRE Cross-Domain Explorer
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
          {(["Explorer", "Species Profile", "Environmental Envelope", "Correlations", "Impact Assessment"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#2EE6C6] text-black font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Main 3-Column Content Layout ──────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[220px]">
        {/* Left Subpanel: Select Species & Taxonomy */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-2 border-r border-white/5 pr-2">
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
              <span className="text-[#2EE6C6] font-bold uppercase tracking-wider">
                Select Species
              </span>
              <span className="text-zinc-500 font-mono">[20 species]</span>
            </div>

            {/* Species Search Input */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search species..."
                className="w-full h-7 pl-7 pr-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono text-white placeholder-zinc-500 outline-none focus:border-[#2EE6C6]/50"
              />
            </div>

            {/* Species Card with Specimen Artwork */}
            <div className="p-2 rounded-lg bg-[#0E2435] border border-[#2EE6C6]/30 relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-white italic">
                    {currentSpecies.name}
                  </h4>
                  <p className="text-[10px] font-mono text-[#809AAB]">
                    {currentSpecies.common}
                  </p>
                </div>
                <ChevronRight size={13} className="text-[#2EE6C6]" />
              </div>

              {/* Specimen Illustration */}
              <div className="relative w-full h-16 my-1 rounded bg-black/50 overflow-hidden border border-white/5 flex items-center justify-center">
                <Image
                  src="/assets/sardinella_longiceps.jpg"
                  alt={currentSpecies.name}
                  fill
                  className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Taxonomy Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-mono pt-1 border-t border-white/5 text-zinc-400">
                <div>Kingdom: <b className="text-white font-normal">{currentSpecies.kingdom}</b></div>
                <div>Phylum: <b className="text-white font-normal">{currentSpecies.phylum}</b></div>
                <div>Class: <b className="text-white font-normal">{currentSpecies.class}</b></div>
                <div>Family: <b className="text-white font-normal">{currentSpecies.family}</b></div>
                <div className="col-span-2">Distribution: <b className="text-[#2EE6C6] font-normal">{currentSpecies.distribution}</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Subpanel: Environmental Envelope vs Observed Chart */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2 border-r border-white/5 pr-2">
          <div>
            <div className="text-[10px] font-mono font-bold text-[#2EE6C6] uppercase tracking-wider mb-1.5">
              Environmental Envelope vs Observed
            </div>

            {/* Environmental Parameter Badges */}
            <div className="grid grid-cols-2 gap-1.5 mb-2 text-[10px] font-mono">
              <div className="p-1.5 rounded bg-black/40 border border-white/5">
                <span className="text-zinc-500 block text-[8px] uppercase">Optimal SST</span>
                <span className="text-white font-bold">{currentSpecies.optSst}</span>
              </div>
              <div className="p-1.5 rounded bg-red-950/30 border border-red-500/30">
                <span className="text-red-400 block text-[8px] uppercase">Current SST</span>
                <span className="text-red-400 font-bold">
                  {currentSpecies.currSst} <b className="text-[9px]">({currentSpecies.sstDelta})</b>
                </span>
              </div>
              <div className="p-1.5 rounded bg-black/40 border border-white/5">
                <span className="text-zinc-500 block text-[8px] uppercase">DOXY Range</span>
                <span className="text-white font-bold">{currentSpecies.doxyRange}</span>
              </div>
              <div className="p-1.5 rounded bg-black/40 border border-white/5">
                <span className="text-zinc-500 block text-[8px] uppercase">Salinity</span>
                <span className="text-white font-bold">{currentSpecies.salinity}</span>
              </div>
            </div>

            {/* Visual SVG Comparison Curve */}
            <div className="p-2 rounded-lg bg-[#0E2435] border border-white/5 h-24 relative flex flex-col justify-end">
              <div className="absolute top-2 left-2 text-[9px] font-mono text-zinc-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-[#2EE6C6]" /> Optimal Band
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-[#FF4B4B]" /> Observed SST
                </span>
              </div>

              <svg className="w-full h-14" viewBox="0 0 240 60" fill="none">
                {/* Optimal Band Fill */}
                <rect x="0" y="24" width="240" height="18" fill="rgba(46,230,198,0.12)" />
                <path d="M0 33 L240 33" stroke="#2EE6C6" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Observed SST Warming Curve */}
                <path
                  d="M 0 45 Q 40 40, 80 34 T 160 22 T 240 12"
                  stroke="#FF4B4B"
                  strokeWidth="2.2"
                />
                <circle cx="240" cy="12" r="3" fill="#FF4B4B" className="animate-ping" />
                <circle cx="240" cy="12" r="2.5" fill="#FF4B4B" />
              </svg>

              <div className="flex justify-between text-[8px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Subpanel: Correlated ARGO Floats */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-1.5">
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
              <span className="text-[#2EE6C6] font-bold uppercase tracking-wider">
                Correlated Floats
              </span>
              <span className="text-[9px] font-mono text-zinc-500">≤50km / ≤7d</span>
            </div>

            {/* List of Correlated Floats */}
            <div className="space-y-1">
              {[
                { id: "1902303", coords: "18.92°N, 72.84°E", temp: "29.4°C", dist: "23km" },
                { id: "5906478", coords: "19.82°N, 72.00°E", temp: "29.1°C", dist: "32km" },
                { id: "2903567", coords: "17.96°N, 72.60°E", temp: "28.9°C", dist: "41km" },
                { id: "6903112", coords: "06.23°N, 85.10°E", temp: "28.7°C", dist: "48km" },
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedFloatId(f.id);
                    flyToCoordinates?.(18.92, 72.84, 2000000);
                  }}
                  className="p-1.5 rounded bg-[#0E2435] hover:bg-[#10293A] border border-white/5 hover:border-[#2EE6C6]/40 flex items-center justify-between cursor-pointer text-[10px] font-mono transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Radio size={10} className="text-[#2EE6C6]" />
                    <span className="font-bold text-white">{f.id}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400">{f.coords}</div>
                </div>
              ))}
            </div>

            <div className="text-[9px] font-mono text-[#809AAB] pt-1 text-center">
              + 8 more matching ARGO profiles
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom AI Diagnosis Alert Banner ──────────────────────────────── */}
      <div className="mt-2.5 p-2 rounded-lg bg-gradient-to-r from-red-950/40 via-[#0B1D2C] to-[#0E2435] border border-red-500/30 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 text-zinc-200">
          <AlertTriangle size={13} className="text-red-400 shrink-0" />
          <span className="text-[11px]">
            <b className="text-red-400">AI Diagnosis:</b> {currentSpecies.diagnosis}
          </span>
        </div>
        <ChevronRight size={13} className="text-red-400 shrink-0" />
      </div>
    </div>
  );
}
