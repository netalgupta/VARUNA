"use client";

import React from "react";
import {
  Globe2,
  MapPin,
  Database,
  AlertTriangle,
  Fish,
  Bot,
  Layers,
} from "lucide-react";
import { useOperationalState, NavItem } from "@/providers/OperationalProvider";

export function FloatingCommandDock() {
  const { activeNav, setActiveNav, copilotOpen, setCopilotOpen } = useOperationalState();

  const dockActions = [
    { id: "COMMAND_CENTER" as NavItem, label: "Center", icon: Globe2 },
    { id: "OCEAN" as NavItem, label: "Map", icon: MapPin },
    { id: "DATASETS" as NavItem, label: "Data", icon: Database },
    { id: "ALERTS" as NavItem, label: "Alerts", icon: AlertTriangle },
    { id: "BIODIVERSITY" as NavItem, label: "Bio", icon: Fish },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-[#020B14]/90 border border-[#2EE6C6]/30 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(46,230,198,0.15)]">
      {dockActions.map((action) => {
        const Icon = action.icon;
        const isActive = activeNav === action.id;

        return (
          <button
            key={action.id}
            onClick={() => setActiveNav(action.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all ${
              isActive
                ? "bg-[#2EE6C6] text-black font-bold shadow-[0_0_12px_#2EE6C6]"
                : "text-[#809AAB] hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={13} className={isActive ? "text-black" : "text-[#2EE6C6]"} />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}

      <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

      {/* Floating Chatbot Toggle */}
      <button
        onClick={() => {
          setActiveNav("COPILOT");
        }}
        className={`px-3.5 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all ${
          activeNav === "COPILOT"
            ? "bg-[#00FFC6] text-black font-bold shadow-[0_0_15px_#00FFC6]"
            : "bg-[#0B1D2C] text-[#00FFC6] border border-[#00FFC6]/40 hover:bg-[#00FFC6]/20"
        }`}
      >
        <Bot size={14} />
        <span className="font-bold">Chatbot</span>
      </button>
    </div>
  );
}
