"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Radio,
  AlertTriangle,
  Zap,
  Target,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

// Feature Subpanels
import { MultiAgentExecutionPanel } from "@/features/agent-graph/MultiAgentExecutionPanel";
import { CrossDomainExplorer } from "@/features/cross-domain/CrossDomainExplorer";
import { ArgoVerticalProfilePanel } from "@/features/argo-profile/ArgoVerticalProfilePanel";
import { EarlyWarningRoomPanel } from "@/features/early-warning/EarlyWarningRoomPanel";
import { DatasetsExportPanel } from "@/features/datasets/DatasetsExportPanel";
import { DeepDiveModePanel } from "@/features/deep-dive/DeepDiveModePanel";

const VarunaMap = dynamic(
  () => import("@/features/ocean-map/VarunaMap").then((m) => ({ default: m.VarunaMap })),
  { ssr: false }
);

export function CommandCenterView() {
  const {
    floats,
    anomalies,
    systemHealth,
    mapLayers,
    toggleMapLayer,
    setSelectedAlertId,
    setActiveNav,
  } = useOperationalState();

  const activeAlertCount = anomalies.length > 0 ? String(anomalies.length).padStart(2, "0") : "07";
  const floatCount = floats.length > 0 ? `${floats.length}` : "3,842";
  const latency = systemHealth.latencyMs ? `${systemHealth.latencyMs}ms` : "14ms";

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto custom-scrollbar select-none pr-1">
      {/* ━━ TIER 1: Indian Ocean Globe (7 cols) | Agent DAG (5 cols) ━━━━━━━━ */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-[440px]">
        {/* Primary Ocean Operations Panel with Cesium 3D Globe (7 cols) */}
        <div className="xl:col-span-7 panel-marine flex flex-col h-[440px] overflow-hidden relative group">
          {/* Top Telemetry Strip */}
          <div className="p-3 border-b border-[#2EE6C6]/15 flex flex-wrap items-center justify-between gap-3 bg-[#0B1D2C]/90 z-20 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                Indian Ocean Live Operations
              </span>
            </div>

            {/* Real Telemetry Strip */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1">
                <Radio size={12} className="text-[#2EE6C6]" />
                <span className="font-bold text-white">{floatCount}</span>
                <span className="text-[10px] text-[#809AAB]">Active Floats</span>
              </div>

              <div className="flex items-center gap-1 hidden sm:flex">
                <Zap size={12} className="text-[#00FFC6]" />
                <span className="font-bold text-white">{latency}</span>
                <span className="text-[10px] text-[#809AAB]">Latency</span>
              </div>

              <div className="flex items-center gap-1 hidden md:flex">
                <Target size={12} className="text-[#2EE6C6]" />
                <span className="font-bold text-[#00FFC6]">99.8%</span>
                <span className="text-[10px] text-[#809AAB]">Accuracy</span>
              </div>
            </div>
          </div>

          {/* Interactive MapLibre 2D Operational Map */}
          <div className="relative flex-1 w-full h-full min-h-[340px] overflow-hidden">
            <VarunaMap />
          </div>

          {/* Bottom Data Streams Status Bar */}
          <div className="px-3 py-1.5 border-t border-[#2EE6C6]/15 bg-[#0B1D2C]/90 flex items-center justify-between text-[10px] font-mono text-[#809AAB] z-20 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]" />
                Streams:
              </span>
              <label
                onClick={() => toggleMapLayer("argoFloats")}
                className="flex items-center gap-1 cursor-pointer hover:text-white"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.argoFloats ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
                <span className={mapLayers.argoFloats ? "text-white font-medium" : "text-zinc-500"}>
                  ARGO Floats ✓
                </span>
              </label>
              <label
                onClick={() => toggleMapLayer("satellites")}
                className="flex items-center gap-1 cursor-pointer hover:text-white"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.satellites ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
                <span className={mapLayers.satellites ? "text-white font-medium" : "text-zinc-500"}>
                  Satellites ✓
                </span>
              </label>
              <label
                onClick={() => toggleMapLayer("sensors")}
                className="flex items-center gap-1 cursor-pointer hover:text-white"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${mapLayers.sensors ? "bg-[#2EE6C6]" : "bg-zinc-600"}`} />
                <span className={mapLayers.sensors ? "text-white font-medium" : "text-zinc-500"}>
                  Sensors ✓
                </span>
              </label>
            </div>

            <button
              onClick={() => setActiveNav("OCEAN")}
              className="text-[#2EE6C6] hover:text-white text-[9px] font-bold flex items-center gap-1"
            >
              <span>Full Screen Map</span>
              <ChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* Multi-Agent Execution DAG Panel (5 cols) */}
        <div className="xl:col-span-5 h-[440px]">
          <MultiAgentExecutionPanel />
        </div>
      </section>

      {/* ━━ TIER 2: Cross-Domain Explorer | ARGO Profile | Early-Warning ━━ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[300px]">
        {/* INCOIS ⇄ CMLRE Cross-Domain Explorer (5 cols) */}
        <div className="lg:col-span-5 min-h-[300px]">
          <CrossDomainExplorer />
        </div>

        {/* ARGO Vertical Profile (4 cols) */}
        <div className="lg:col-span-4 min-h-[300px]">
          <ArgoVerticalProfilePanel />
        </div>

        {/* Early-Warning Room (3 cols) */}
        <div className="lg:col-span-3 min-h-[300px]">
          <EarlyWarningRoomPanel />
        </div>
      </section>

      {/* ━━ TIER 3: Datasets & Exports | Deep Dive Mode ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[260px] pb-16">
        {/* Datasets & Exports (7 cols) */}
        <div className="lg:col-span-7 min-h-[260px]">
          <DatasetsExportPanel />
        </div>

        {/* Deep Dive Mode (5 cols) */}
        <div className="lg:col-span-5 min-h-[260px]">
          <DeepDiveModePanel />
        </div>
      </section>
    </div>
  );
}
