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
    <aside className="w-48 bg-[#020B14]/95 border-r border-[#2EE6C6]/15 flex flex-col justify-between p-2 z-30 shrink-0 select-none">
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
              className={`w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-mono transition-all group ${
                isActive
                  ? "bg-[#0B1D2C] text-[#00FFC6] font-bold border border-[#2EE6C6]/40 shadow-[0_0_12px_rgba(46,230,198,0.15)]"
                  : "text-[#809AAB] hover:text-white hover:bg-[#0B1D2C]/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  size={14}
                  className={`shrink-0 ${
                    isActive
                      ? "text-[#00FFC6]"
                      : "text-[#809AAB] group-hover:text-[#2EE6C6] transition-colors"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {displayBadge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
                    item.badgeColor || "bg-[#2EE6C6]/20 text-[#2EE6C6]"
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
      <div className="pt-2 border-t border-white/5">
        <div className="p-2 rounded-lg bg-[#0B1D2C]/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 flex items-center justify-center shrink-0">
              <User size={12} className="text-[#2EE6C6]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-bold text-white truncate">
                VARUNA Core
              </div>
              <div className="text-[9px] font-mono text-[#809AAB] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]" />
                <span>v2.4 · Online</span>
              </div>
            </div>
          </div>
          <ChevronRight size={12} className="text-zinc-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
