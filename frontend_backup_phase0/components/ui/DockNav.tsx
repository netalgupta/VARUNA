"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import {
  type LucideIcon,
  Map,
  MessageSquare,
  Database,
  AlertTriangle,
  Fish,
  Waves,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
}

/**
 * 4 Operational Modes + Copilot Chat for the VARUNA Command Center HUD
 */
export const NAV_ITEMS: NavItemConfig[] = [
  { id: "MAP", icon: Map, label: "Fleet Map (INCOIS)" },
  { id: "ANALYSIS", icon: Database, label: "Data Explorer & SQL" },
  { id: "ALERTS", icon: AlertTriangle, label: "MHW & Hypoxia Alerts", badge: "LIVE" },
  { id: "BIODIVERSITY", icon: Fish, label: "CMLRE Living Resources" },
  { id: "chat", icon: MessageSquare, label: "VARUNA Copilot (AI)" },
];

function DockItem({
  item,
  active,
  onSelect,
  mouseX,
}: {
  item: NavItemConfig;
  active: boolean;
  onSelect: (id: string) => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  const distance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return val - (rect.left + rect.width / 2);
  });

  const scale = useTransform(distance, [-90, 0, 90], [1, 1.45, 1]);
  const springScale = useSpring(scale, { stiffness: 280, damping: 22 });

  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center" ref={ref}>
      {/* Label Tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          className="absolute -top-11 px-3 py-1 rounded-xl text-[10.5px] font-mono bg-bg-2/95 border border-border-strong text-text whitespace-nowrap pointer-events-none z-50 shadow-2xl backdrop-blur-xl flex items-center gap-1.5"
        >
          <span>{item.label}</span>
          {item.badge && (
            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono bg-coral/20 text-coral border border-coral/30">
              {item.badge}
            </span>
          )}
        </motion.div>
      )}

      <motion.div
        style={{ scale: springScale }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect(item.id)}
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer relative
          transition-colors duration-200 origin-bottom
          ${
            active
              ? "bg-accent/20 border border-accent/50 shadow-[0_0_20px_rgba(46,230,198,0.25)]"
              : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25"
          }
        `}
        whileTap={{ scale: 0.92 }}
      >
        <Icon
          size={18}
          className={
            active
              ? "text-accent"
              : "text-zinc-400 group-hover:text-zinc-200 transition-colors"
          }
        />

        {/* Live alert dot for alerts view */}
        {item.id === "ALERTS" && !active && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-coral animate-ping" />
        )}

        {/* Active glowing indicator */}
        {active && (
          <motion.span
            layoutId="dock-active-dot"
            className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.div>
    </div>
  );
}

export function DockNav({
  activeId,
  onViewChange,
}: {
  activeId: string;
  onViewChange: (id: string) => void;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 24 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      <div className="glass-strong rounded-2xl px-4 py-2.5 flex items-end gap-2.5 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/35 flex items-center justify-center mr-1 shadow-[0_0_12px_rgba(46,230,198,0.2)]">
          <Waves size={18} className="text-accent" />
        </div>
        <span className="w-px h-6 self-center bg-white/10" />

        {NAV_ITEMS.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            active={activeId === item.id}
            onSelect={onViewChange}
            mouseX={mouseX}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default DockNav;
