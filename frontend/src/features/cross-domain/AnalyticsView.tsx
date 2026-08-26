"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Database,
  Layers,
  TrendingUp,
  Sparkles,
  Activity,
  Flame,
  Droplets,
  Wind,
  Maximize2,
  Minimize2,
  Download,
  Filter,
} from "lucide-react";
import { CrossDomainExplorer } from "./CrossDomainExplorer";
import { TSIsopycnals } from "@/components/charts/TSIsopycnals";
import { HovmollerDiagram } from "@/components/charts/HovmollerDiagram";
import { O2TempCorrelation } from "@/components/charts/O2TempCorrelation";
import { useOperationalState } from "@/providers/OperationalProvider";

export function AnalyticsView() {
  const { selectedFloatProfile, selectedFloatId } = useOperationalState();
  const [hovmollerVar, setHovmollerVar] = useState<"temp" | "psal" | "doxy">("temp");
  const [chartMode, setChartMode] = useState<"DUAL" | "TS" | "HOVMOLLER" | "OXYGEN">("DUAL");

  // High-Resolution Depth-Time Series for Hovmöller Contours (0 - 1000m across 2026)
  const hovmollerData = useMemo(() => {
    const dates = [
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
      "2026-05-15",
      "2026-06-15",
      "2026-07-15",
      "2026-08-15",
    ];
    const depths = [5, 15, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];

    const records: Array<{ time: string; pres: number; temp: number; psal: number; doxy: number; val: number }> = [];

    dates.forEach((d, dIdx) => {
      // Seasonal SST warming peak in May/June
      const seasonalWarming = Math.sin((dIdx / (dates.length - 1)) * Math.PI) * 2.8;
      const baseSst = 27.2 + seasonalWarming;

      depths.forEach((p) => {
        // Temperature Profile (°C)
        let t = baseSst;
        if (p > 30) {
          const zNorm = (p - 30) / 970;
          t = 5.0 + (baseSst - 5.0) * Math.exp(-zNorm * 3.5);
        }

        // Salinity Profile (PSU) - Arabian Sea Salinity Maximum at 60m
        let s = 35.7 + (p <= 80 ? 0.6 * Math.sin((p / 80) * Math.PI) : -0.8 * ((p - 80) / 920));

        // Dissolved Oxygen Profile (µmol/kg) - Severe OMZ between 100m and 500m
        let o2 = 215.0;
        if (p > 40 && p <= 400) {
          o2 = 25.0 + 15.0 * Math.sin(((p - 40) / 360) * Math.PI);
        } else if (p > 400) {
          o2 = 40.0 + 45.0 * ((p - 400) / 600);
        }

        const selectedVal = hovmollerVar === "temp" ? t : hovmollerVar === "psal" ? s : o2;

        records.push({
          time: d,
          pres: p,
          temp: parseFloat(t.toFixed(2)),
          psal: parseFloat(s.toFixed(2)),
          doxy: parseFloat(o2.toFixed(1)),
          val: parseFloat(selectedVal.toFixed(2)),
        });
      });
    });

    return records;
  }, [hovmollerVar]);

  // Temperature-Salinity (T-S) Profile Data (Dynamic from active profile or high-precision baseline)
  const tsData = useMemo(() => {
    if (selectedFloatProfile?.measurements && selectedFloatProfile.measurements.length > 0) {
      return selectedFloatProfile.measurements.map((m) => ({
        temp: m.temp,
        psal: m.psal,
        pres: m.pres ?? m.depth_m ?? 0,
      }));
    }

    // High-resolution multi-water-mass standard CTD cast for Arabian Sea & Bay of Bengal
    return [
      { psal: 36.4, temp: 29.8, pres: 5.0 },
      { psal: 36.4, temp: 29.6, pres: 15.0 },
      { psal: 36.5, temp: 28.9, pres: 30.0 },
      { psal: 36.6, temp: 27.4, pres: 50.0 },
      { psal: 36.5, temp: 25.2, pres: 75.0 },
      { psal: 36.2, temp: 22.8, pres: 100.0 },
      { psal: 35.8, temp: 18.5, pres: 150.0 },
      { psal: 35.4, temp: 15.2, pres: 200.0 },
      { psal: 35.2, temp: 13.0, pres: 250.0 },
      { psal: 35.1, temp: 11.4, pres: 300.0 },
      { psal: 35.0, temp: 9.8, pres: 400.0 },
      { psal: 34.9, temp: 8.5, pres: 500.0 },
      { psal: 34.8, temp: 7.1, pres: 700.0 },
      { psal: 34.8, temp: 5.4, pres: 1000.0 },
      { psal: 34.7, temp: 3.8, pres: 1500.0 },
      { psal: 34.7, temp: 2.2, pres: 2000.0 },
    ];
  }, [selectedFloatProfile]);

  // Oxygen vs Temperature Scatter Data
  const o2TempData = useMemo(() => {
    return {
      temp: tsData.map((d) => d.temp),
      doxy: tsData.map((d) => {
        if (d.pres <= 40) return 210 - d.pres * 1.5;
        if (d.pres <= 300) return 30 + Math.random() * 15;
        return 50 + (d.pres / 2000) * 40;
      }),
      pres: tsData.map((d) => d.pres),
    };
  }, [tsData]);

  return (
    <div className="flex flex-col h-full space-y-3.5 p-1 overflow-y-auto custom-scrollbar select-none font-sans">
      {/* ── Top Component: INCOIS ⇄ CMLRE Cross-Domain Fusion Explorer ── */}
      <div className="min-h-[420px]">
        <CrossDomainExplorer />
      </div>

      {/* ── Bottom Component: Oceanographic Advanced Scientific Analytics Suite ── */}
      <div className="p-3.5 rounded-2xl bg-[#0B1D2C]/90 border border-sky-500/20 shadow-2xl space-y-3">
        {/* Section Header & Sub-Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-500/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.25)]">
              <BarChart3 size={14} />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Advanced Oceanographic Scientific Diagnostics Suite
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Water mass sigma-isopycnals &amp; BGC depth-time spatio-temporal evolution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Hovmöller Parameter Switcher */}
            <div className="flex items-center gap-1 bg-[#061220] p-0.5 rounded-xl border border-sky-500/25">
              <span className="text-[10px] text-slate-400 px-2">Hovmöller Var:</span>
              <button
                onClick={() => setHovmollerVar("temp")}
                className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                  hovmollerVar === "temp"
                    ? "bg-rose-500 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Temp (°C)
              </button>
              <button
                onClick={() => setHovmollerVar("psal")}
                className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                  hovmollerVar === "psal"
                    ? "bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Salinity (PSU)
              </button>
              <button
                onClick={() => setHovmollerVar("doxy")}
                className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                  hovmollerVar === "doxy"
                    ? "bg-emerald-500 text-black font-bold shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                DOXY (µmol/kg)
              </button>
            </div>

            {/* Layout Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#061220] p-0.5 rounded-xl border border-sky-500/25">
              <button
                onClick={() => setChartMode("DUAL")}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] transition-all ${
                  chartMode === "DUAL"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Dual Grid
              </button>
              <button
                onClick={() => setChartMode("TS")}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] transition-all ${
                  chartMode === "TS"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                T-S Isopycnals
              </button>
              <button
                onClick={() => setChartMode("HOVMOLLER")}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] transition-all ${
                  chartMode === "HOVMOLLER"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Hovmöller Depth
              </button>
              <button
                onClick={() => setChartMode("OXYGEN")}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] transition-all ${
                  chartMode === "OXYGEN"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                O₂-Temp OMZ
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Chart Grid */}
        {chartMode === "DUAL" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[340px]">
            <div className="lg:col-span-6 h-[340px]">
              <TSIsopycnals
                data={tsData}
                title="T-S Diagram · Water Mass Isopycnals (ASHSW / RSOW / IOCW)"
              />
            </div>
            <div className="lg:col-span-6 h-[340px]">
              <HovmollerDiagram
                data={hovmollerData}
                variable={hovmollerVar}
                title={`Hovmöller Spatio-Temporal Depth Evolution: ${
                  hovmollerVar === "temp"
                    ? "Temperature (°C)"
                    : hovmollerVar === "psal"
                    ? "Practical Salinity (PSU)"
                    : "Dissolved Oxygen (µmol/kg)"
                }`}
              />
            </div>
          </div>
        )}

        {chartMode === "TS" && (
          <div className="w-full h-[420px]">
            <TSIsopycnals
              data={tsData}
              title="Temperature-Salinity (T-S) Diagram with Calculated Sigma-t Isopycnals & Water Masses"
            />
          </div>
        )}

        {chartMode === "HOVMOLLER" && (
          <div className="w-full h-[420px]">
            <HovmollerDiagram
              data={hovmollerData}
              variable={hovmollerVar}
              title={`Hovmöller Spatio-Temporal Depth Heatmap (0–1000m Depth Evolution)`}
            />
          </div>
        )}

        {chartMode === "OXYGEN" && (
          <div className="w-full h-[420px]">
            <O2TempCorrelation
              data={o2TempData}
              title="Dissolved Oxygen (DOXY) vs In-Situ Temperature · Oxygen Minimum Zone (OMZ) Structure"
            />
          </div>
        )}
      </div>
    </div>
  );
}
