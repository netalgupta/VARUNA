"use client";

import React from "react";
import {
  LayoutDashboard,
  Globe2,
  Radio,
  AlertTriangle,
  Fish,
  Activity,
  BarChart3,
  TrendingUp,
  Database,
  Bot,
  ChevronRight,
  User,
} from "lucide-react";
import { useOperationalState, NavItem } from "@/providers/OperationalProvider";

interface NavConfigItem {
  id: NavItem | "EVENTS" | "SATELLITES";
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeType?: "red" | "cyan" | "blue";
}

interface NavSection {
  title: string;
  items: NavConfigItem[];
}

export function LeftNav() {
  const { activeNav, setActiveNav, anomalies, setCopilotOpen } = useOperationalState();
  const alertCount = anomalies.length > 0 ? anomalies.length : 3;

  const NAV_SECTIONS: NavSection[] = [
    {
      title: "COMMAND",
      items: [
        { id: "COMMAND_CENTER", label: "Overview", icon: LayoutDashboard },
        { id: "OCEAN", label: "Ocean", icon: Globe2 },
        { id: "FLOATS", label: "ARGO Floats", icon: Radio },
        { id: "ALERTS", label: "Alerts", icon: AlertTriangle, badge: alertCount, badgeType: "red" },
      ],
    },
    {
      title: "OBSERVE",
      items: [
        { id: "BIODIVERSITY", label: "Biodiversity", icon: Fish },
        { id: "ALERTS", label: "Events", icon: Activity },
      ],
    },
    {
      title: "ANALYZE",
      items: [
        { id: "ANALYTICS", label: "Analytics", icon: BarChart3 },
        { id: "FORECASTS", label: "Forecasts", icon: TrendingUp },
        { id: "DATASETS", label: "Datasets", icon: Database },
      ],
    },
    {
      title: "AI",
      items: [
        { id: "COPILOT", label: "Varuna AI", icon: Bot, badge: "Beta", badgeType: "blue" },
      ],
    },
  ];

  return (
    <aside className="w-52 bg-[#040914]/95 border-r border-sky-500/15 flex flex-col justify-between p-3 z-30 shrink-0 select-none overflow-y-auto custom-scrollbar">
      {/* ── Grouped Navigation Sections ───────────────────────────────────── */}
      <div className="space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase px-2 mb-1">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                (item.id === "COMMAND_CENTER" && activeNav === "COMMAND_CENTER" && section.title === "COMMAND") ||
                item.id === activeNav;

              return (
                <button
                  key={`${section.title}-${item.label}`}
                  onClick={() => {
                    if (item.id === "COPILOT") {
                      setActiveNav("COPILOT");
                      setCopilotOpen(false);
                    } else if (item.id !== "EVENTS" && item.id !== "SATELLITES") {
                      setActiveNav(item.id as NavItem);
                    }
                  }}
                  className={`w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs transition-all group cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white font-semibold shadow-[0_0_14px_rgba(0,229,255,0.3)] border border-cyan-400/40"
                      : "text-slate-400 hover:text-white hover:bg-[#091830]/60 border border-transparent font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={14}
                      className={`shrink-0 ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-cyan-300 transition-colors"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                        item.badgeType === "red"
                          ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                          : item.badgeType === "blue"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                          : "bg-[#0d1d36] text-cyan-300 border border-sky-500/25"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Bottom System Status Card ─────────────────────────────────────── */}
      <div className="pt-3 border-t border-sky-500/15 mt-3">
        <div className="p-2 rounded-xl bg-[#081426]/90 border border-sky-500/20 flex items-center justify-between shadow-xs cursor-pointer hover:border-cyan-400/40 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0d1d36] border border-sky-500/30 flex items-center justify-center shrink-0 text-cyan-400">
              <User size={13} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                Admin Console
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="font-medium">Operational</span>
              </div>
            </div>
          </div>
          <ChevronRight size={13} className="text-slate-400 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
