"use client";

import React from "react";
import { BarChart3, Database, Layers, TrendingUp, Sparkles } from "lucide-react";
import { CrossDomainExplorer } from "./CrossDomainExplorer";
import { TSIsopycnals } from "@/components/charts/TSIsopycnals";
import { HovmollerDiagram } from "@/components/charts/HovmollerDiagram";

export function AnalyticsView() {
  // Sample TS Diagram profile points
  const tsData = [
    { psal: 35.8, temp: 29.4, pres: 5.0 },
    { psal: 35.8, temp: 28.8, pres: 20.0 },
    { psal: 36.1, temp: 26.2, pres: 50.0 },
    { psal: 35.7, temp: 21.0, pres: 100.0 },
    { psal: 35.2, temp: 14.5, pres: 200.0 },
    { psal: 34.9, temp: 9.2, pres: 500.0 },
    { psal: 34.8, temp: 5.1, pres: 1000.0 },
  ];

  // Hovmöller Spatio-Temporal Depth Time Series
  const hovmollerData = [
    { time: "2026-02-01", pres: 10, val: 27.5 },
    { time: "2026-02-01", pres: 50, val: 24.2 },
    { time: "2026-02-01", pres: 100, val: 20.1 },
    { time: "2026-03-01", pres: 10, val: 28.1 },
    { time: "2026-03-01", pres: 50, val: 25.0 },
    { time: "2026-03-01", pres: 100, val: 20.8 },
    { time: "2026-04-01", pres: 10, val: 29.3 },
    { time: "2026-04-01", pres: 50, val: 26.1 },
    { time: "2026-04-01", pres: 100, val: 21.5 },
    { time: "2026-05-01", pres: 10, val: 30.2 },
    { time: "2026-05-01", pres: 50, val: 27.4 },
    { time: "2026-05-01", pres: 100, val: 22.0 },
    { time: "2026-06-01", pres: 10, val: 29.8 },
    { time: "2026-06-01", pres: 50, val: 26.5 },
    { time: "2026-06-01", pres: 100, val: 21.2 },
    { time: "2026-07-01", pres: 10, val: 29.1 },
    { time: "2026-07-01", pres: 50, val: 25.8 },
    { time: "2026-07-01", pres: 100, val: 20.5 },
    { time: "2026-08-01", pres: 10, val: 29.4 },
    { time: "2026-08-01", pres: 50, val: 26.2 },
    { time: "2026-08-01", pres: 100, val: 21.0 },
  ];

  return (
    <div className="flex flex-col h-full space-y-3 p-1 overflow-y-auto custom-scrollbar select-none">
      {/* Top Cross-Domain Explorer */}
      <div className="min-h-[380px]">
        <CrossDomainExplorer />
      </div>

      {/* Bottom Oceanographic Advanced Scientific Chart Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[360px]">
        <div className="lg:col-span-6 h-[360px]">
          <TSIsopycnals data={tsData} title="Temperature-Salinity (T-S) Diagram · Water Mass Classification" />
        </div>
        <div className="lg:col-span-6 h-[360px]">
          <HovmollerDiagram data={hovmollerData} variable="temp" title="Hovmöller Spatio-Temporal Depth Hovmöller Contours" />
        </div>
      </div>
    </div>
  );
}
