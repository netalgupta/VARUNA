"use client";

import React, { useState } from "react";
import { OperationalProvider, useOperationalState } from "@/providers/OperationalProvider";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { LeftNav } from "@/components/navigation/LeftNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";

// Dedicated Operational Views
import { CommandCenterView } from "@/features/command-center/CommandCenterView";
import { OceanView } from "@/features/ocean/OceanView";
import { FloatsView } from "@/features/argo/FloatsView";
import { AlertsView } from "@/features/anomalies/AlertsView";
import { BiodiversityView } from "@/features/biodiversity/BiodiversityView";
import { AnalyticsView } from "@/features/cross-domain/AnalyticsView";
import { ForecastsView } from "@/features/early-warning/ForecastsView";
import { DatasetsView } from "@/features/datasets/DatasetsView";
import { CopilotView } from "@/features/copilot/CopilotView";

function OperationsCommandCenter() {
  const { activeNav } = useOperationalState();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeNav) {
      case "COMMAND_CENTER":
        return <CommandCenterView />;
      case "OCEAN":
        return <OceanView />;
      case "FLOATS":
        return <FloatsView />;
      case "ALERTS":
        return <AlertsView />;
      case "BIODIVERSITY":
        return <BiodiversityView />;
      case "ANALYTICS":
        return <AnalyticsView />;
      case "FORECASTS":
        return <ForecastsView />;
      case "DATASETS":
        return <DatasetsView />;
      case "COPILOT":
        return <CopilotView />;
      default:
        return <CommandCenterView />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030712] text-[#D6F6FF] overflow-hidden select-none">
      {/* ── 1. Global Header ──────────────────────────────────────────────── */}
      <GlobalHeader onOpenSearch={() => setPaletteOpen(true)} />

      {/* ── 2. Master Viewport Body ───────────────────────────────────────── */}
      <div className="flex flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Navigation */}
        <LeftNav />

        {/* Dynamic Dedicated Operational View */}
        <main className="flex-1 h-full overflow-hidden p-3.5">
          {renderActiveView()}
        </main>
      </div>

      {/* ── 4. Global Search Palette (⌘ K) ─────────────────────────────────── */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── 5. AI Copilot Drawer ──────────────────────────────────────────── */}
      {activeNav !== "COPILOT" && <CopilotDrawer />}
    </div>
  );
}

export default function CommandCenterPage() {
  return (
    <OperationalProvider>
      <OperationsCommandCenter />
    </OperationalProvider>
  );
}
