"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const INTENTS = [
  "NEAREST_FLOAT near Mumbai",
  "TEMP_PROFILE Arabian Sea 0-2000m",
  "SAL_ANOMALY Bay of Bengal",
  "FLEET_STATUS Indian Ocean",
  "OXYGEN_TREND Equatorial IO",
  "CHLA_CORRELATION NW Arabian",
  "FLOAT_TRAJECTORY 1902303",
  "SQL_STATS monthly averages",
  "DEPTH_PROFILE salinity gradient",
  "BASIN_COMPARE seasonal bias",
];

export function DataStatusBar() {
  const [connected, setConnected] = useState(false);
  const [floatCount, setFloatCount] = useState(0);
  const [queryCount, setQueryCount] = useState(0);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Probe the backend health
    fetch(apiUrl + "/health")
      .then((r) => { if (r.ok) setConnected(true); })
      .catch(() => setConnected(false));

    fetch(apiUrl + "/api/v1/floats?limit=1")
      .then((r) => r.json())
      .then((d) => setFloatCount(d?.total ?? d?.length ?? 0))
      .catch(() => {});
  }, []);

  // Duplicate for seamless loop
  const items = [...INTENTS, ...INTENTS];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-9 shrink-0 flex items-center justify-between px-4 glass border-b border-white/5 overflow-hidden relative"
    >
      {/* Left: live status */}
      <div className="flex items-center gap-4 shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-accent dot-live" : "bg-zinc-600"}`}
          />
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <span className="w-px h-3 bg-white/10" />
        <span className="text-[11px] font-mono text-zinc-500">
          <span className="text-accent">{floatCount || "—"}</span> floats
        </span>
      </div>

      {/* Centre: kinetic marquee */}
      <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none">
        <div className="marquee-track flex gap-8 whitespace-nowrap pl-[50%]">
          {items.map((intent, i) => (
            <span
              key={i}
              className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest"
            >
              {intent}
            </span>
          ))}
        </div>
      </div>

      {/* Right: time */}
      <div className="shrink-0 z-10">
        <span className="text-[11px] font-mono text-zinc-600">
          {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST
        </span>
      </div>
    </motion.div>
  );
}
