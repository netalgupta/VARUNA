"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waves,
  Globe2,
  Map as MapIcon,
  Search,
  Command,
  Flame,
  Fish,
  Database,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  ArrowRight,
} from "lucide-react";
import { DataStatusBar } from "@/components/ui/DataStatusBar";
import { DockNav } from "@/components/ui/DockNav";
import { ChatPanel } from "@/components/ChatPanel";
import { AnalysisHub } from "@/components/AnalysisHub";

export type ActiveView = "MAP" | "ANALYSIS" | "ALERTS" | "BIODIVERSITY";

// Heavy WebGL components — dynamic import to avoid SSR crash
const OceanMap = dynamic(() => import("@/components/OceanMap"), { ssr: false });
const OceanGlobe = dynamic(
  () => import("@/components/Globe/OceanGlobe").then((m) => ({ default: m.OceanGlobe })),
  { ssr: false }
);

// ── Placeholder Mount Point for dev/M5-netal (AnomalyAlerts.tsx) ────────────
// Note: Per Section 0 ownership boundaries, internal UI logic is owned by M5.
function AlertsViewStub() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="glass-strong p-8 rounded-3xl max-w-xl w-full border border-coral/30 shadow-[0_25px_60px_rgba(255,127,80,0.15)] text-center space-y-4 backdrop-blur-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-coral/15 border border-coral/40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(255,127,80,0.25)]">
          <Flame size={28} className="text-coral animate-pulse" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-coral animate-ping" />
            <span className="text-[10px] font-mono font-bold text-coral uppercase tracking-widest">
              Live Early-Warning Feed · Active
            </span>
          </div>
          <h2 className="text-xl font-mono font-bold text-text">
            MHW &amp; Hypoxia Situational Room
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Hobday et al. (2016) $P_{90}$ Climatological Heatwave &amp; Hypoxic Anomaly Detection
          </p>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Target Module:</span>
            <span className="text-accent">frontend/components/AnomalyAlerts.tsx</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Ownership Domain:</span>
            <span className="text-glow">dev/M5-netal (Geospatial &amp; Alert Center)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">API Endpoint:</span>
            <span className="text-zinc-300">GET /api/v1/anomalies</span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-zinc-500 italic">
          Mount point ready for AnomalyAlerts component integration.
        </p>
      </motion.div>
    </div>
  );
}

// ── Placeholder Mount Point for dev/M6-kanishka (CrossDomainExplorer.tsx) ───
// Note: Per Section 0 ownership boundaries, internal UI logic is owned by M6.
function BiodiversityViewStub() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="glass-strong p-8 rounded-3xl max-w-xl w-full border border-accent/30 shadow-[0_25px_60px_rgba(46,230,198,0.15)] text-center space-y-4 backdrop-blur-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(46,230,198,0.25)]">
          <Fish size={28} className="text-accent animate-pulse" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-accent dot-live" />
            <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
              CMLRE Darwin Core · Synced
            </span>
          </div>
          <h2 className="text-xl font-mono font-bold text-text">
            Marine Living Resources Catalog
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            500+ Indian Ocean Species ⇄ ARGO Float Spatio-Temporal Joins (&le;50km, &le;7d)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Target Module:</span>
            <span className="text-accent">frontend/components/Explorer/CrossDomainExplorer.tsx</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Ownership Domain:</span>
            <span className="text-glow">dev/M6-kanishka (Analytics &amp; Cross-Domain)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">API Endpoints:</span>
            <span className="text-zinc-300">GET /api/v1/biodiversity · GET /api/v1/correlate</span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-zinc-500 italic">
          Mount point ready for CrossDomainExplorer component integration.
        </p>
      </motion.div>
    </div>
  );
}

// ── Global Command Palette (Cmd+K / Ctrl+K) ──────────────────────────────────
function CommandPalette({
  isOpen,
  onClose,
  onSelectView,
  onToggleGlobe,
  isGlobe,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ActiveView) => void;
  onToggleGlobe: () => void;
  isGlobe: boolean;
}) {
  const [search, setSearch] = useState("");

  const COMMAND_ITEMS = [
    {
      id: "view_map",
      title: "Switch to 2D/3D Fleet Map",
      desc: "INCOIS ARGO Float Fleet spatial situational canvas",
      icon: MapIcon,
      action: () => {
        onSelectView("MAP");
        onClose();
      },
    },
    {
      id: "view_analysis",
      title: "Switch to Data Explorer",
      desc: "Multi-parameter oceanographic profiles & PostGIS SQL",
      icon: Database,
      action: () => {
        onSelectView("ANALYSIS");
        onClose();
      },
    },
    {
      id: "view_alerts",
      title: "Switch to MHW & Hypoxia Alerts",
      desc: "Hobday (2016) Marine Heatwave early warning system",
      icon: AlertTriangle,
      action: () => {
        onSelectView("ALERTS");
        onClose();
      },
    },
    {
      id: "view_bio",
      title: "Switch to CMLRE Living Resources",
      desc: "Species distributions & thermal envelope stress joins",
      icon: Fish,
      action: () => {
        onSelectView("BIODIVERSITY");
        onClose();
      },
    },
    {
      id: "toggle_globe",
      title: isGlobe ? "Switch to 2D Deck.gl Map" : "Switch to 3D WebGL Globe",
      desc: "Toggle between 2D high-density canvas and 3D bathymetry globe",
      icon: Globe2,
      action: () => {
        onToggleGlobe();
        onClose();
      },
    },
  ];

  const filtered = COMMAND_ITEMS.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-lg glass-strong rounded-2xl border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden z-10"
        >
          {/* Search Input Bar */}
          <div className="p-3 border-b border-white/5 flex items-center gap-3">
            <Search size={16} className="text-accent ml-1" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command, mode, or query shortcut…"
              className="flex-1 bg-transparent text-sm font-mono text-text outline-none placeholder-zinc-500"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-500 hover:text-text hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* List of Actions */}
          <div className="p-2 max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-accent/10 border border-transparent hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 group-hover:bg-accent/20 group-hover:border-accent/40 flex items-center justify-center text-zinc-400 group-hover:text-accent transition-colors">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-text group-hover:text-white">
                          {item.title}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all mr-1"
                    />
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">
                No matching command found.
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Navigation: ↑ ↓ · Select: ↵</span>
            <span>Close: ESC</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function DashboardPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("MAP");
  const [isGlobe, setIsGlobe] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const handleRunInSqlConsole = useCallback((sql: string) => {
    setActiveView("ANALYSIS");
  }, []);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-bg">
      {/* ── Background Map / 3D Globe Layer (Always alive, blurred when in other views) ── */}
      <div
        className={`absolute inset-0 z-0 transition-all duration-700 ${
          activeView !== "MAP"
            ? "blur-md scale-105 opacity-35 pointer-events-none"
            : "blur-0 scale-100 opacity-100"
        }`}
      >
        {isGlobe ? <OceanGlobe /> : <OceanMap />}
        {/* Layered Gradient for depth stratification */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-bg/50 via-transparent to-bg/70" />
      </div>

      {/* ── View Content Area ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeView === "ANALYSIS" && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10"
          >
            <AnalysisHub />
          </motion.div>
        )}

        {activeView === "ALERTS" && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10"
          >
            <AlertsViewStub />
          </motion.div>
        )}

        {activeView === "BIODIVERSITY" && (
          <motion.div
            key="biodiversity"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10"
          >
            <BiodiversityViewStub />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Navigation / VARUNA Platform Rebranding ──────────────────── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between pointer-events-none"
      >
        <div className="flex items-center gap-4 pointer-events-auto">
          {/* VARUNA Primary Brand */}
          <div className="glass px-4 py-2.5 rounded-2xl flex items-center gap-3.5 shadow-2xl backdrop-blur-2xl border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shadow-[0_0_15px_rgba(46,230,198,0.25)]">
              <Waves size={20} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] font-mono font-bold tracking-tight text-text">
                  VARUNA
                </h1>
                <span className="text-[9px] font-mono text-glow bg-glow/10 px-1.5 py-0.2 rounded border border-glow/30">
                  SIH 2026
                </span>
              </div>
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-[0.16em]">
                National Marine Data Backbone · INCOIS ⇄ CMLRE
              </p>
            </div>
          </div>

          {/* 2D Map / 3D Globe Mode Switcher */}
          {activeView === "MAP" && (
            <div className="hidden sm:flex items-center gap-1 glass p-1 rounded-xl border border-white/10 shadow-lg">
              <button
                onClick={() => setIsGlobe(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                  !isGlobe
                    ? "bg-accent/20 border border-accent/40 text-accent font-semibold shadow-[0_0_10px_rgba(46,230,198,0.2)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <MapIcon size={12} />
                <span>2D DeckGL</span>
              </button>
              <button
                onClick={() => setIsGlobe(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                  isGlobe
                    ? "bg-accent/20 border border-accent/40 text-accent font-semibold shadow-[0_0_10px_rgba(46,230,198,0.2)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Globe2 size={12} />
                <span>3D Globe</span>
              </button>
            </div>
          )}

          {/* Command Palette Button */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl glass hover:border-accent/40 text-zinc-400 hover:text-zinc-200 transition-all text-xs font-mono group"
          >
            <Search size={13} className="text-zinc-500 group-hover:text-accent transition-colors" />
            <span>Search / Commands</span>
            <kbd className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-zinc-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Live Data Status Telemetry */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <DataStatusBar />
        </div>
      </motion.div>

      {/* ── Floating Side HUD (VARUNA Ocean Copilot) ────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="absolute top-24 bottom-28 right-6 z-20 w-full max-w-[430px] pointer-events-auto"
          >
            <ChatPanel onRunInSqlConsole={handleRunInSqlConsole} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Fleet Health Overlay (Left Side) ─────────────────────────────── */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-28 left-6 z-20 flex flex-col gap-3 pointer-events-auto"
      >
        <div className="glass p-4 rounded-2xl w-64 shadow-2xl backdrop-blur-2xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
              Fleet Health &amp; Sync
            </h3>
            <span className="w-2 h-2 rounded-full bg-accent dot-live" />
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Active ARGO Floats", val: "3,842", color: "var(--accent)" },
              { label: "PostGIS Spatial Latency", val: "14ms", color: "var(--accent-secondary)" },
              { label: "Nemotron-550B Accuracy", val: "99.8%", color: "var(--glow)" },
              { label: "CMLRE Species Catalog", val: "500+ Sp.", color: "var(--accent)" },
            ].map((m) => (
              <div key={m.label} className="flex items-end justify-between">
                <span className="text-[10.5px] text-zinc-400 font-mono">
                  {m.label}
                </span>
                <span
                  className="text-xs font-bold font-mono"
                  style={{ color: m.color }}
                >
                  {m.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Navigation Dock ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="pointer-events-auto pb-6">
          <DockNav
            activeId={activeView}
            onViewChange={(id) => {
              if (id === "chat") {
                setChatOpen((prev) => !prev);
              } else {
                setActiveView(id as ActiveView);
              }
            }}
          />
        </div>
      </div>

      {/* ── Global Command Palette Modal ──────────────────────────────────── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectView={(v) => setActiveView(v)}
        onToggleGlobe={() => setIsGlobe((prev) => !prev)}
        isGlobe={isGlobe}
      />
    </div>
  );
}
