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
    <aside className="w-48 bg-[#09090b] border-r border-white/[0.08] flex flex-col justify-between p-2 z-30 shrink-0 select-none text-xs">
      {/* ── Navigation Links ──────────────────────────────────────────────── */}
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          const displayBadge = item.id === "ALERTS" ? alertCount : item.badge;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full h-8 px-2.5 rounded-md flex items-center justify-between text-xs transition-colors group ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  size={14}
                  className={`shrink-0 ${
                    isActive
                      ? "text-blue-400"
                      : "text-zinc-500 group-hover:text-zinc-300 transition-colors"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {displayBadge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0 ${
                    item.id === "ALERTS"
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-zinc-800 text-zinc-400"
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
      <div className="pt-2 border-t border-white/[0.06]">
        <div className="p-2 rounded-md bg-zinc-900/80 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
              <User size={11} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-zinc-200 truncate">
                Admin Console
              </div>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </div>
            </div>
          </div>
          <ChevronRight size={11} className="text-zinc-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
