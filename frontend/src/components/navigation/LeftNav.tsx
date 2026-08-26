"use client";

import React from "react";
import {
  LayoutDashboard,
  Globe2,
  Radio,
  AlertTriangle,
  Fish,
  BarChart3,
  TrendingUp,
  Database,
  Bot,
  ChevronRight,
  User,
} from "lucide-react";
import { useOperationalState, NavItem } from "@/providers/OperationalProvider";

interface NavConfigItem {
  id: NavItem;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

const NAV_ITEMS: NavConfigItem[] = [
  { id: "COMMAND_CENTER", label: "Command Center", icon: LayoutDashboard },
  { id: "OCEAN", label: "Ocean", icon: Globe2 },
  { id: "FLOATS", label: "ARGO Floats", icon: Radio },
  { id: "ALERTS", label: "Alerts", icon: AlertTriangle, badge: 7, badgeColor: "bg-[#FF4B4B] text-white" },
  { id: "BIODIVERSITY", label: "Biodiversity", icon: Fish },
  { id: "ANALYTICS", label: "Analytics", icon: BarChart3 },
  { id: "FORECASTS", label: "Forecasts", icon: TrendingUp },
  { id: "DATASETS", label: "Datasets", icon: Database },
  { id: "COPILOT", label: "Chatbot", icon: Bot },
];

export function LeftNav() {
  const { activeNav, setActiveNav, anomalies } = useOperationalState();
  const alertCount = anomalies.length > 0 ? anomalies.length : 7;

  return (
    <aside className="w-60 bg-[#060c18]/95 border-r border-sky-500/20 flex flex-col justify-between p-3 z-30 shrink-0 select-none">
      {/* ── Navigation Links ──────────────────────────────────────────────── */}
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          const displayBadge = item.id === "ALERTS" ? alertCount : item.badge;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full h-10 px-3.5 rounded-lg flex items-center justify-between text-sm transition-all group cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-sky-500/25 to-blue-600/20 text-white font-semibold border border-sky-400/40 shadow-[0_0_14px_rgba(56,189,248,0.2)]"
                  : "text-slate-300 hover:text-white hover:bg-[#0e1c36]/75 border border-transparent font-medium"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  size={18}
                  className={`shrink-0 ${
                    isActive
                      ? "text-sky-400"
                      : "text-slate-400 group-hover:text-sky-300 transition-colors"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {displayBadge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${
                    item.id === "ALERTS"
                      ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                      : "bg-[#0e1c36] text-sky-300 border border-sky-500/25"
                  }`}
                >
                  {displayBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom System Status Card ─────────────────────────────────────── */}
      <div className="pt-3 border-t border-sky-500/20">
        <div className="p-2.5 rounded-lg bg-[#0a1426]/90 border border-sky-500/25 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0e1c36] border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
              <User size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                Admin Console
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="font-medium">Operational</span>
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
