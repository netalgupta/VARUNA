"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Database, 
  Maximize2, 
  Box, 
  Thermometer, 
  Droplets, 
  Wind,
  TrendingUp,
  Grid
} from "lucide-react";
import { ChartRouter } from "@/components/charts/ChartRouter";

// Taste-skill: Premium staggered reveals for high-density data
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } }
};

export function AnalysisHub() {
  const [selectedFloat, setSelectedFloat] = useState("1902303");
  
  // Mock data for immediate visual impact while backend syncs
  const telemetry = [
    { label: "SST", value: "28.4°C", icon: Thermometer, trend: "+0.2" },
    { label: "Salinity", value: "35.2 PSU", icon: Droplets, trend: "-0.1" },
    { label: "Nitrate", value: "4.2 µmol", icon: TrendingUp, trend: "+0.5" },
    { label: "Velocity", value: "0.45 m/s", icon: Wind, trend: "0.0" }
  ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="absolute inset-0 z-10 flex flex-col p-8 pt-28 overflow-y-auto custom-scrollbar"
    >
      <div className="max-w-7xl mx-auto w-full space-y-8 pb-32">
        
        {/* ── Header: Scientific Control ────────────────────────────────── */}
        <motion.div variants={item} className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-mono font-bold text-text mb-1 flex items-center gap-3">
              <Database className="text-accent" size={24} />
              ANALYSIS_HUB.v2
            </h2>
            <p className="text-xs font-mono text-text-3 tracking-[0.2em] uppercase">Multi-Phase Oceanographic Suite</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 glass rounded-lg border border-white/5 flex items-center gap-3">
              <span className="text-[10px] font-mono text-text-3 uppercase">Active Focus</span>
              <select 
                className="bg-transparent text-xs font-bold font-mono text-accent outline-none"
                value={selectedFloat}
                onChange={(e) => setSelectedFloat(e.target.value)}
              >
                <option value="1902303">ARGO_1902303</option>
                <option value="5906478">ARGO_5906478</option>
                <option value="2903567">ARGO_2903567</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* ── Top Level Telemetry Grid ──────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {telemetry.map((stat, i) => (
            <div key={i} className="glass-strong p-5 rounded-2xl border border-white/5 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <stat.icon size={48} className="text-accent" />
              </div>
              <p className="text-[10px] font-mono text-text-3 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold font-mono text-text">{stat.value}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-mono ${stat.trend.startsWith('+') ? 'text-accent' : 'text-coral'}`}>
                  {stat.trend}%
                </span>
                <span className="text-[9px] font-mono text-text-3 uppercase">vs 24h baseline</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Scientific Chart Suite (The 20+ Graphs Area) ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visualizer */}
          <motion.div variants={item} className="lg:col-span-8 space-y-6">
            <div className="glass-strong rounded-3xl p-6 h-[500px] border border-white/5 relative flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-accent" />
                  </div>
                  <h4 className="text-sm font-mono font-bold text-text uppercase">Spectral Depth Profile</h4>
                </div>
                <button className="text-text-3 hover:text-accent transition-colors">
                  <Maximize2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 bg-bg/50 rounded-2xl border border-white/5 overflow-hidden">
                {/* Router will handle the specialized charts */}
                <ChartRouter vizSpecs={{ 
                  chart_type: "ts_isopycnals", 
                  chart_data: { temp: [28,26,24,22,20], psal: [35,35.1,35.2,35.3,35.4], pres: [0,50,100,200,500] } 
                }} />
              </div>

              <div className="mt-4 flex items-center gap-6">
                {[
                  { label: "Stability", val: "High" },
                  { label: "Anomalies", val: "None" },
                  { label: "Confidence", val: "94%" }
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-3 uppercase">{m.label}:</span>
                    <span className="text-[10px] font-mono font-bold text-accent">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="glass-strong rounded-3xl p-6 h-64 border border-white/5">
                  <h4 className="text-sm font-mono font-bold text-text uppercase mb-4">Hovmöller Diagram</h4>
                  <div className="h-40 bg-bg/50 rounded-xl border border-white/5 flex items-center justify-center italic text-xs text-text-3">
                    Awaiting Profile Stream...
                  </div>
               </div>
               <div className="glass-strong rounded-3xl p-6 h-64 border border-white/5">
                  <h4 className="text-sm font-mono font-bold text-text uppercase mb-4">Oxygen Correlation</h4>
                  <div className="h-40 bg-bg/50 rounded-xl border border-white/5 flex items-center justify-center italic text-xs text-text-3">
                    Awaiting BGC Sensor Input...
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Side Panel: Fleet Status & Data Control */}
          <motion.div variants={item} className="lg:col-span-4 space-y-6">
            <div className="glass-strong rounded-3xl p-6 border border-white/5">
              <h4 className="text-sm font-mono font-bold text-text uppercase mb-4 flex items-center gap-2">
                <Activity size={16} className="text-accent" />
                Data Stream
              </h4>
              <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 accent-pulse" />
                    <div>
                      <p className="text-[11px] font-mono text-text font-bold">PROFILE_CHUNK_{100 + i}</p>
                      <p className="text-[10px] font-mono text-text-3 uppercase">Platform {1902000 + i} • 14:23:01</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-xs font-mono font-bold text-text-2 hover:bg-white/5 hover:text-accent transition-all">
                VIEW_FULL_PIPELINE
              </button>
            </div>

            <div className="glass-strong rounded-3xl p-6 border border-white/5 bg-accent/5">
              <h4 className="text-sm font-mono font-bold text-text uppercase mb-2">Scientific Alert</h4>
              <p className="text-[11px] text-text-2 leading-relaxed font-mono">
                Detected localized thermocline shift in NE Arabian Sea sector. Recommend target mission for float {selectedFloat}.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
