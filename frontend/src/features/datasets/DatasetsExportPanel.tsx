"use client";

import React, { useState } from "react";
import {
  Database,
  Search,
  Download,
  FileSpreadsheet,
  Layers,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useOperationalState } from "@/providers/OperationalProvider";

const DATASETS = [
  {
    name: "ARGO Float Profiles",
    coverage: "Global IO",
    params: "T, S, DOXY, CHLA",
    updated: "2 min ago",
    size: "2.4 GB",
    sql: "SELECT platform_number, time, latitude, longitude, temp, psal, doxy, chla FROM public.marine_data LIMIT 1000",
  },
  {
    name: "Indian Ocean SST",
    coverage: "Satellite",
    params: "SST, Anomaly",
    updated: "15 min ago",
    size: "1.8 GB",
    sql: "SELECT time, latitude, longitude, temp AS sst FROM public.marine_data LIMIT 1000",
  },
  {
    name: "BGC Parameters",
    coverage: "BGC Floats",
    params: "CHLA, NITRATE, PH",
    updated: "1 hr ago",
    size: "980 MB",
    sql: "SELECT platform_number, time, chla, nitrate, ph_in_situ_total FROM public.marine_data WHERE chla IS NOT NULL LIMIT 1000",
  },
  {
    name: "CMLRE Biodiversity",
    coverage: "Occurrences",
    params: "Species, Habitat",
    updated: "3 hr ago",
    size: "620 MB",
    sql: "SELECT scientific_name, common_name, latitude, longitude, depth_m, event_date FROM public.biodiversity_occurrences LIMIT 1000",
  },
];

export function DatasetsExportPanel() {
  const [activeTab, setActiveTab] = useState<"Live Data" | "Historical" | "My Exports">("Live Data");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "parquet" | "netcdf">("parquet");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format = selectedFormat) => {
    setIsExporting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const sql = DATASETS[0].sql;
      const exportUrl = `${apiBase}/api/v1/export?sql=${encodeURIComponent(sql)}&format=${format === "netcdf" ? "csv" : format}`;
      window.open(exportUrl, "_blank");
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = DATASETS.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.params.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="panel-marine flex flex-col h-full overflow-hidden p-3.5 bg-[#0B1D2C]/90 relative select-none">
      {/* ── Header & Sub-Tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 mb-2.5 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center">
            <Database size={12} className="text-[#00FFC6]" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Datasets &amp; Exports
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(["Live Data", "Historical", "My Exports"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded transition-all ${
                activeTab === tab
                  ? "bg-[#2EE6C6] text-black font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout: Table + Export Preview Sidebar ────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-[170px]">
        {/* Left Datasets Table */}
        <div className="col-span-8 flex flex-col justify-between space-y-1.5 border-r border-white/5 pr-2">
          {/* Search Bar */}
          <div className="relative mb-1">
            <Search size={11} className="absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets, floats, variables..."
              className="w-full h-6 pl-7 pr-2 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-white placeholder-zinc-500 outline-none focus:border-[#2EE6C6]/50"
            />
          </div>

          {/* Columnar Table */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="text-zinc-500 border-b border-white/5 pb-1">
                  <th className="pb-1 font-semibold">Dataset</th>
                  <th className="pb-1 font-semibold">Coverage</th>
                  <th className="pb-1 font-semibold">Parameters</th>
                  <th className="pb-1 font-semibold">Updated</th>
                  <th className="pb-1 font-semibold">Size</th>
                  <th className="pb-1 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((d) => (
                  <tr key={d.name} className="hover:bg-white/5 group transition-colors">
                    <td className="py-1 font-bold text-white truncate max-w-[110px]">{d.name}</td>
                    <td className="py-1 text-zinc-400">{d.coverage}</td>
                    <td className="py-1 text-zinc-300 truncate max-w-[90px]">{d.params}</td>
                    <td className="py-1 text-zinc-400">{d.updated}</td>
                    <td className="py-1 text-[#2EE6C6] font-bold">{d.size}</td>
                    <td className="py-1 text-right">
                      <button
                        onClick={() => handleExport("csv")}
                        title="Download CSV"
                        className="p-1 rounded bg-[#2EE6C6]/15 hover:bg-[#2EE6C6] text-[#2EE6C6] hover:text-black transition-colors"
                      >
                        <Download size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Export Preview Sidebar */}
        <div className="col-span-4 bg-[#0E2435] rounded-lg border border-white/5 p-2.5 flex flex-col justify-between text-[10px] font-mono">
          <div>
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Export Preview
            </div>

            {/* Format Picker */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              {(["csv", "parquet", "netcdf"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                    selectedFormat === fmt
                      ? "bg-[#2EE6C6] text-black shadow-[0_0_8px_#2EE6C6]"
                      : "bg-black/40 text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Export Details */}
            <div className="space-y-1 text-[9px] text-zinc-400 border-t border-white/5 pt-1.5">
              <div className="flex justify-between">
                <span>Approx. Rows</span>
                <span className="text-white font-bold">1.2M</span>
              </div>
              <div className="flex justify-between">
                <span>Date Range</span>
                <span className="text-white font-bold">2026-02-01 → 2026-08-14</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase text-zinc-500 mb-0.5">Variables</span>
                <span className="text-[#2EE6C6]">Temp, Salinity, DOXY, CHLA</span>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={() => handleExport(selectedFormat)}
            disabled={isExporting}
            className="w-full h-7 rounded bg-[#2EE6C6] hover:bg-[#00FFC6] text-black font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(46,230,198,0.3)] mt-1.5 disabled:opacity-50"
          >
            <Download size={11} />
            <span>{isExporting ? "Streaming..." : "Export Now →"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
