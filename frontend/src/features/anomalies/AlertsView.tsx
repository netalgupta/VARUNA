"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Flame,
  Droplets,
  ShieldCheck,
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  Radio,
  ExternalLink,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";
import { EarlyWarningRoomPanel } from "@/features/early-warning/EarlyWarningRoomPanel";

export function AlertsView() {
  const { anomalies, selectedAlertId, setSelectedAlertId, activeAnomaly, flyToCoordinates } =
    useOperationalState();

  const currentAlert = activeAnomaly || anomalies[0];

  return (
    <div className="flex flex-col h-full space-y-3 p-1 overflow-y-auto custom-scrollbar select-none">
      {/* ── Main Layout: Alerts Feed on Left + Detailed Dossier & Map on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Alerts Feed (4 Cols) */}
        <div className="lg:col-span-4 panel-marine p-3.5 bg-[#0B1D2C]/90 flex flex-col justify-between h-[600px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#FF4B4B]" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Active Alerts ({anomalies.length})
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-red-950/40 text-red-400 rounded border border-red-500/30">
                PROACTIVE SCANNER
              </span>
            </div>

            {/* List of Alerts */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {anomalies.map((a) => {
                const isSelected = a.id === selectedAlertId;
                const isMHW = a.alert_type === "MARINE_HEATWAVE";

                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedAlertId(a.id);
                      flyToCoordinates?.(
                        (a.lat_min + a.lat_max) / 2,
                        (a.lon_min + a.lon_max) / 2,
                        2500000
                      );
                    }}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer text-xs font-mono transition-all ${
                      isSelected
                        ? "bg-[#0E2435] border-[#FF4B4B] shadow-[0_0_15px_rgba(255,75,75,0.25)]"
                        : "bg-[#0E2435]/60 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {isMHW ? <Flame size={12} className="text-red-400" /> : <Droplets size={12} className="text-amber-400" />}
                        {a.alert_type}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          a.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-300 font-bold mt-1">
                      {a.ocean_basin.toUpperCase().replace("_", " ")}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 pt-1 border-t border-white/5">
                      <span className="text-[#FF4B4B] font-bold">
                        {isMHW ? `+${a.anomaly_value}°C` : `${a.current_value} µmol/kg`}
                      </span>
                      <span>Duration: {a.duration_days} days</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Dossier & Early Warning Room (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Detailed Alert Dossier Card */}
          {currentAlert && (
            <div className="panel-marine p-3.5 bg-[#0B1D2C]/90 font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-[#FF4B4B]" />
                  <span className="font-bold text-white text-sm">
                    Alert Dossier #{currentAlert.id} · {currentAlert.ocean_basin.toUpperCase().replace("_", " ")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    flyToCoordinates?.(
                      (currentAlert.lat_min + currentAlert.lat_max) / 2,
                      (currentAlert.lon_min + currentAlert.lon_max) / 2,
                      2000000
                    )
                  }
                  className="px-2 py-0.5 rounded bg-[#2EE6C6]/15 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black font-bold text-[9px] flex items-center gap-1 border border-[#2EE6C6]/30"
                >
                  <MapPin size={10} />
                  <span>Center on 3D Globe</span>
                </button>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded bg-[#0E2435] border border-white/5">
                  <span className="text-zinc-400 block text-[8px] uppercase">Current Value</span>
                  <span className="text-white font-bold">{currentAlert.current_value}°C</span>
                </div>
                <div className="p-2 rounded bg-[#0E2435] border border-white/5">
                  <span className="text-zinc-400 block text-[8px] uppercase">Climatological Mean</span>
                  <span className="text-white font-bold">{currentAlert.baseline_value}°C</span>
                </div>
                <div className="p-2 rounded bg-red-950/40 border border-red-500/40">
                  <span className="text-red-400 block text-[8px] uppercase">Thermal Anomaly</span>
                  <span className="text-red-400 font-bold">+{currentAlert.anomaly_value}°C</span>
                </div>
                <div className="p-2 rounded bg-[#0E2435] border border-white/5">
                  <span className="text-zinc-400 block text-[8px] uppercase">Consecutive Duration</span>
                  <span className="text-[#00FFC6] font-bold">{currentAlert.duration_days} Days</span>
                </div>
              </div>

              {/* Policy Advisory */}
              <div className="p-2.5 rounded bg-[#0E2435] border border-white/10 text-[10px]">
                <div className="text-[#00FFC6] font-bold uppercase mb-1 flex items-center gap-1">
                  <ShieldCheck size={12} /> Coastal Fisheries &amp; Policy Advisory
                </div>
                <p className="text-zinc-300 leading-relaxed">{currentAlert.policy_advisory}</p>
              </div>
            </div>
          )}

          {/* Early-Warning Timeline & Contour Visualizer */}
          <div className="h-[300px]">
            <EarlyWarningRoomPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
