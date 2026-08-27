"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Radio, Fish, AlertTriangle, Database, Sparkles, ArrowRight } from "lucide-react";
import { useOperationalState, NavItem } from "@/providers/OperationalProvider";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const {
    floats,
    biodiversity,
    anomalies,
    setSelectedFloatId,
    setSelectedSpecies,
    setSelectedAlertId,
    setActiveNav,
    setCopilotOpen,
  } = useOperationalState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFloats = floats.filter(
    (f) =>
      String(f.wmo_id).includes(query) ||
      (f.platform_number && String(f.platform_number).includes(query))
  );

  const filteredSpecies = biodiversity.filter(
    (b) =>
      b.scientific_name.toLowerCase().includes(query.toLowerCase()) ||
      b.common_name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAlerts = anomalies.filter(
    (a) =>
      a.ocean_basin.toLowerCase().includes(query.toLowerCase()) ||
      a.alert_type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-[#0B1D2C] border border-[#2EE6C6]/30 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(46,230,198,0.2)] overflow-hidden flex flex-col">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search size={18} className="text-[#2EE6C6] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ARGO floats, marine species, anomaly alerts, datasets..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 font-mono text-xs">
          {/* Quick Actions */}
          {!query && (
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-2 block mb-1">
                Quick Commands
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveNav("COPILOT");
                    setCopilotOpen(false);
                    onClose();
                  }}
                  className="w-full p-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-zinc-300 hover:text-white group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#00FFC6]" />
                    <span>Open VARUNA AI Copilot</span>
                  </div>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#2EE6C6]" />
                </button>
                <button
                  onClick={() => {
                    setActiveNav("DATASETS");
                    onClose();
                  }}
                  className="w-full p-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-zinc-300 hover:text-white group"
                >
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-[#2EE6C6]" />
                    <span>Export Marine Datasets (CSV / Parquet)</span>
                  </div>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#2EE6C6]" />
                </button>
              </div>
            </div>
          )}

          {/* ARGO Floats */}
          {filteredFloats.length > 0 && (
            <div>
              <span className="text-[10px] text-[#2EE6C6] uppercase tracking-widest px-2 block mb-1">
                ARGO Floats ({filteredFloats.length})
              </span>
              <div className="space-y-1">
                {filteredFloats.slice(0, 5).map((f) => (
                  <button
                    key={f.wmo_id}
                    onClick={() => {
                      setSelectedFloatId(String(f.wmo_id));
                      setActiveNav("COMMAND_CENTER");
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-zinc-300 hover:text-white group"
                  >
                    <div className="flex items-center gap-2">
                      <Radio size={14} className="text-[#2EE6C6]" />
                      <span>ARGO Float WMO #{f.wmo_id}</span>
                      <span className="text-[10px] text-zinc-500">
                        ({f.last_lat.toFixed(2)}°N, {f.last_lon.toFixed(2)}°E)
                      </span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#2EE6C6]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Species */}
          {filteredSpecies.length > 0 && (
            <div>
              <span className="text-[10px] text-[#00FFC6] uppercase tracking-widest px-2 block mb-1">
                CMLRE Living Resources ({filteredSpecies.length})
              </span>
              <div className="space-y-1">
                {filteredSpecies.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSpecies(s.scientific_name);
                      setActiveNav("COMMAND_CENTER");
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-zinc-300 hover:text-white group"
                  >
                    <div className="flex items-center gap-2">
                      <Fish size={14} className="text-[#00FFC6]" />
                      <span>
                        <em>{s.scientific_name}</em> — {s.common_name}
                      </span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00FFC6]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Anomalies */}
          {filteredAlerts.length > 0 && (
            <div>
              <span className="text-[10px] text-red-400 uppercase tracking-widest px-2 block mb-1">
                Marine Anomalies ({filteredAlerts.length})
              </span>
              <div className="space-y-1">
                {filteredAlerts.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAlertId(a.id);
                      setActiveNav("COMMAND_CENTER");
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-zinc-300 hover:text-white group"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span>
                        {a.alert_type} ({a.ocean_basin.toUpperCase().replace("_", " ")})
                      </span>
                      <span className="text-[10px] text-red-400 font-bold">
                        +{a.anomaly_value}°C
                      </span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
