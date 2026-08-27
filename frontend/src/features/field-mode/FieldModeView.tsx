"use client";

import React from "react";
import { MobileFieldPanel } from "./MobileFieldPanel";
import { ShieldCheck, AlertTriangle, Radio, Navigation, Compass } from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

export function FieldModeView() {
  const { anomalies, floats } = useOperationalState();

  return (
    <div className="flex flex-col h-full space-y-3 p-1 overflow-y-auto custom-scrollbar select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[550px]">
        {/* Left Mobile Device Emulation Container (5 Cols) */}
        <div className="lg:col-span-5 h-[550px]">
          <MobileFieldPanel />
        </div>

        {/* Right Emergency Field Telemetry & Action Center (7 Cols) */}
        <div className="lg:col-span-7 panel-marine p-4 bg-[#0B1D2C]/90 font-mono text-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#00FFC6]" />
                <span className="font-bold text-white uppercase text-sm">
                  Field Mode Operations &amp; Coastal Emergency Dispatch
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30 font-bold">
                EMERGENCY PRIORITY
              </span>
            </div>

            {/* Emergency Alerts Feed */}
            <div className="space-y-2 mt-3">
              <div className="text-zinc-400 text-[11px] font-bold uppercase">
                Active Coastal Advisories
              </div>
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg bg-[#0E2435] border border-red-500/30 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{a.alert_type} ({a.ocean_basin.toUpperCase().replace("_", " ")})</span>
                    <span className="text-red-400 font-bold text-[10px]">+{a.anomaly_value}°C</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">{a.policy_advisory}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Field Operations Coordinates */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Field Station</span>
              <span className="text-white font-bold">Kochi Coastal Command (CMLRE)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Nearest Surface Buoy</span>
              <span className="text-[#2EE6C6] font-bold">ARGO #1902303 (23.4 km offshore)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
