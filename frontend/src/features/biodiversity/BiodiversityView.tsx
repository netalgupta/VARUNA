"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Fish,
  Search,
  Radio,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Render SST Environmental Envelope vs Observed Chart ──────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 180;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let y = 20; y < h - 20; y += 30) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();

      const tempVal = Math.round(34 - ((y - 20) / (h - 40)) * 16);
      ctx.fillStyle = "#84948F";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${tempVal}°C`, 10, y + 4);
    }

    // Months axis
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const stepX = (w - 70) / (months.length - 1);
    months.forEach((m, idx) => {
      const x = 50 + idx * stepX;
      ctx.fillStyle = "#84948F";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(m, x - 10, h - 6);
    });

    // 1. Optimal SST Band (Green shaded zone 22°C - 26°C)
    const yOptMin = 20 + ((34 - 26) / 16) * (h - 40);
    const yOptMax = 20 + ((34 - 22) / 16) * (h - 40);
    ctx.fillStyle = "rgba(46, 230, 198, 0.12)";
    ctx.fillRect(50, yOptMin, w - 70, yOptMax - yOptMin);
    ctx.strokeStyle = "rgba(46, 230, 198, 0.4)";
    ctx.strokeRect(50, yOptMin, w - 70, yOptMax - yOptMin);

    // 2. Observed SST Curve (Red Anomaly Line Jan-Aug 2026)
    const sstPoints = [26.4, 27.1, 28.0, 29.5, 30.8, 31.4, 30.2, 29.2];
    ctx.beginPath();
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 3;

    sstPoints.forEach((val, idx) => {
      const x = 50 + idx * stepX;
      const y = 20 + ((34 - val) / 16) * (h - 40);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points & tooltip markers
    sstPoints.forEach((val, idx) => {
      const x = 50 + idx * stepX;
      const y = 20 + ((34 - val) / 16) * (h - 40);
      ctx.fillStyle = val > 28 ? "#EF4444" : "#2EE6C6";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Legend
    ctx.fillStyle = "#2EE6C6";
    ctx.fillRect(w - 240, 8, 10, 10);
    ctx.fillStyle = "#D5E4F7";
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("Optimal Habitat Band (22–26°C)", w - 224, 17);

    ctx.fillStyle = "#EF4444";
    ctx.fillRect(w - 240, 24, 10, 2);
    ctx.fillText("Observed Arabian Sea SST (2026)", w - 224, 28);
  }, []);

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

      {/* ── Netal 3-Card Featured Species Bento Grid ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURED_SPECIES.map((spec, idx) => (
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

      {/* ── SST Environmental Envelope Chart ──────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold font-mono text-white tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-[#00FFC6]" />
            SST ENVIRONMENTAL ENVELOPE vs OBSERVED (Jan–Aug 2026)
          </h4>
          <span className="text-[10px] font-mono text-[#2EE6C6] bg-[#2EE6C6]/10 px-2 py-0.5 rounded border border-[#2EE6C6]/30">
            INCOIS BGC Telemetry
          </span>
        </div>

        <div className="w-full bg-[#071A2D]/60 rounded-xl p-2 border border-white/5">
          <canvas ref={canvasRef} className="w-full h-44 rounded" />
        </div>

        <p className="font-mono text-xs text-[#F87171] font-semibold flex items-center gap-1.5 pt-1">
          <AlertTriangle size={14} className="text-[#F87171] shrink-0" />
          <span>
            ⚠ AI Diagnosis: 3 out of 6 key commercial species are experiencing thermal stress above optimal SST bands — habitat compression and northward range shift predicted for Q3 2026.
          </span>
        </p>
      </div>

      {/* ── Complete CMLRE Species Database Catalog Table ─────────────────── */}
      <div className="p-5 rounded-2xl bg-[#0B1D2C]/90 border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Fish size={16} className="text-[#00FFC6]" />
            <h4 className="text-sm font-bold font-mono text-white tracking-wider">
              CMLRE Marine Living Resources Catalog ({biodiversity.length || 500} Occurrences)
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
