"use client";

import React, { useState, useMemo } from 'react';
import { Activity, Droplets, Thermometer, Wind } from 'lucide-react';

interface OceanChartProps {
  rows?: Record<string, any>[] | null;
  vizSpecs?: Record<string, any> | null;
  title?: string;
}

interface DataPoint {
  pres: number;
  val: number;
  time: string;
  raw: Record<string, any>;
}

export function OceanChart({ rows, vizSpecs, title }: OceanChartProps) {
  // 1. Extract data points from rows or vizSpecs
  const data: Record<string, any>[] = useMemo(() => {
    if (rows && Array.isArray(rows) && rows.length > 0) return rows;
    if (vizSpecs?.chart_data?.profiles) {
      const pids = Object.keys(vizSpecs.chart_data.profiles);
      if (pids.length > 0) return vizSpecs.chart_data.profiles[pids[0]];
    }
    if (Array.isArray(vizSpecs?.chart_data)) return vizSpecs.chart_data;
    return [];
  }, [rows, vizSpecs]);

  // 2. Discover available numeric variables in the dataset
  const availableVars = useMemo(() => {
    if (data.length === 0) return [];
    const sample = data[0];
    const vars: { key: string; label: string; unit: string; color: string; icon: any }[] = [];

    const keys = Object.keys(sample);
    const findKey = (candidates: string[]) => keys.find((k) => candidates.includes(k.toLowerCase()));

    const tempKey = findKey(['temp', 'temperature', 'avg_temp', 'sst']);
    if (tempKey && typeof sample[tempKey] === 'number') {
      vars.push({ key: tempKey, label: 'Temperature', unit: '°C', color: '#FF6B4A', icon: Thermometer });
    }

    const psalKey = findKey(['psal', 'salinity', 'avg_psal']);
    if (psalKey && typeof sample[psalKey] === 'number') {
      vars.push({ key: psalKey, label: 'Salinity', unit: 'PSU', color: '#2BFFBD', icon: Droplets });
    }

    const doxyKey = findKey(['doxy', 'dissolved_oxygen', 'avg_doxy', 'oxygen']);
    if (doxyKey && typeof sample[doxyKey] === 'number') {
      vars.push({ key: doxyKey, label: 'Dissolved O₂', unit: 'µmol/kg', color: '#00F0FF', icon: Wind });
    }

    if (vars.length === 0) {
      // Check for distance in co-location queries
      const distKey = findKey(['dist_km', 'distance_km', 'distance']);
      if (distKey && typeof sample[distKey] === 'number') {
        vars.push({ key: distKey, label: 'Co-location Distance', unit: 'km', color: '#2EE6C6', icon: Activity });
      } else {
        // Fallback: any genuine numeric measurement key (excluding all identifiers and metadata)
        const EXCLUDED_KEYS = new Set([
          'pres', 'pressure', 'depth', 'depth_m', 'maximum_depth_m', 'minimum_depth_m',
          'lat', 'latitude', 'lon', 'longitude', 'time', 'date', 'id', 'cycle', 'cycle_number',
          'float_id', 'argo_float_id', 'platform_number', 'wmo', 'record_id', 'occurrence_id',
          'tax_id', 'species_id', 'cluster_id', 'index',
        ]);
        keys.forEach((k) => {
          const lk = k.toLowerCase();
          if (!EXCLUDED_KEYS.has(lk) && typeof sample[k] === 'number') {
            vars.push({ key: k, label: k.replace(/_/g, ' ').toUpperCase(), unit: '', color: '#00FFC6', icon: Activity });
          }
        });
      }
    }

    return vars;
  }, [data]);

  const [selectedVarKey, setSelectedVarKey] = useState<string>(() => {
    return availableVars[0]?.key || 'temp';
  });

  const activeVar = useMemo(() => {
    return availableVars.find((v) => v.key === selectedVarKey) || availableVars[0] || {
      key: 'temp',
      label: 'Temperature',
      unit: '°C',
      color: '#FF6B4A',
      icon: Thermometer,
    };
  }, [availableVars, selectedVarKey]);

  // 3. Process sanitized points (Deduplicate & average duplicate X coords to eliminate sawtooth oscillations)
  const isDistanceMode = useMemo(() => {
    return data.some((d) => typeof d.dist_km === 'number' || (d.dist_km !== undefined && d.dist_km !== null));
  }, [data]);

  const points: DataPoint[] = useMemo(() => {
    if (data.length === 0) return [];

    const mapped = data
      .map((d: Record<string, any>, index: number) => {
        const pres = isDistanceMode
          ? Number(d.dist_km ?? index * 50)
          : Number(d.pres ?? d.pressure ?? d.depth ?? index * 20);
        const val = Number(d[activeVar.key] ?? d.temp ?? d.temperature ?? 0);
        const time = String(d.time ?? d.date ?? '');
        return { pres, val, time, raw: d };
      })
      .filter((d: DataPoint) => !isNaN(d.pres) && !isNaN(d.val) && isFinite(d.pres) && isFinite(d.val));

    // Group & average duplicate/near-identical X values to eliminate sawtooth/zigzag artifacts
    const grouped = new Map<number, { sumVal: number; count: number; raw: any; time: string }>();
    for (const p of mapped) {
      const bucketX = isDistanceMode ? Math.round(p.pres * 10) / 10 : Math.round(p.pres * 2) / 2;
      const existing = grouped.get(bucketX);
      if (existing) {
        existing.sumVal += p.val;
        existing.count += 1;
      } else {
        grouped.set(bucketX, { sumVal: p.val, count: 1, raw: p.raw, time: p.time });
      }
    }

    return Array.from(grouped.entries())
      .map(([x, g]) => ({
        pres: x,
        val: g.sumVal / g.count,
        time: g.time,
        raw: g.raw,
      }))
      .sort((a, b) => a.pres - b.pres);
  }, [data, activeVar, isDistanceMode]);

  // 4. Statistics Calculation
  const stats = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 0, mean: 0, surface: 0, deep: 0 };
    const vals = points.map((p: DataPoint) => p.val);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    const surface = points[0]?.val ?? 0;
    const deep = points[points.length - 1]?.val ?? 0;
    return { min, max, mean, surface, deep };
  }, [points]);

  // Hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // If no available variables or no real data points, do not render a dummy graph
  if (availableVars.length === 0 || points.length === 0) return null;

  // SVG Geometry Settings
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const minX = points[0]?.pres ?? 0;
  const maxX = points[points.length - 1]?.pres ?? 2000;
  const spanX = Math.max(1, maxX - minX);

  const minY = Math.floor(stats.min - (stats.max - stats.min) * 0.1);
  const maxY = Math.ceil(stats.max + (stats.max - stats.min) * 0.1);
  const spanY = Math.max(0.1, maxY - minY);

  const getX = (pres: number) => padLeft + ((pres - minX) / spanX) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minY) / spanY) * plotH;

  // Generate SVG Path
  const pathD = points.reduce((acc: string, p: DataPoint, i: number) => {
    const x = getX(p.pres);
    const y = getY(p.val);
    if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    return `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Generate Closed Area Path for gradient fill
  const areaD = points.length > 0
    ? `${pathD} L ${getX(points[points.length - 1].pres).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${getX(points[0].pres).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
    : '';

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="w-full rounded-xl bg-[#061422]/95 border border-white/10 p-3 shadow-2xl flex flex-col gap-2 font-mono select-none">
      {/* ── Top Bar: Variable Selector & Stats HUD ──────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        {/* Variable Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableVars.map((v) => {
            const isSelected = v.key === activeVar.key;
            return (
              <button
                key={v.key}
                onClick={() => setSelectedVarKey(v.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-[#2EE6C6]/20 text-[#2EE6C6] border-[#2EE6C6]/40 shadow-[0_0_8px_rgba(46,230,198,0.2)]'
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.color }} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Stats Summary */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <div>
            Surface: <b className="text-white">{stats.surface.toFixed(2)} {activeVar.unit}</b>
          </div>
          <div>
            Deep: <b className="text-white">{stats.deep.toFixed(2)} {activeVar.unit}</b>
          </div>
          <div>
            Avg: <b className="text-[#2EE6C6]">{stats.mean.toFixed(2)} {activeVar.unit}</b>
          </div>
        </div>
      </div>

      {/* ── Interactive SVG Oceanographic Canvas ────────────────────────── */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[260px] overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${activeVar.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeVar.color} stopOpacity="0.3" />
              <stop offset="80%" stopColor={activeVar.color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={activeVar.color} stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padTop + pct * plotH;
            const val = maxY - pct * spanY;
            return (
              <g key={`gy-${i}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X Axis Depth Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const x = padLeft + pct * plotW;
            const depth = Math.round(minX + pct * spanX);
            return (
              <g key={`gx-${i}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={padTop + plotH + 16}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="9"
                >
                  {depth}m
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill={`url(#grad-${activeVar.key})`} />

          {/* Glow Line */}
          <path
            d={pathD}
            fill="none"
            stroke={activeVar.color}
            strokeWidth="3.5"
            opacity="0.3"
            filter="url(#glow)"
          />

          {/* Main Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke={activeVar.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p: DataPoint, i: number) => {
            const cx = getX(p.pres);
            const cy = getY(p.val);
            const isHovered = hoverIndex === i;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : points.length > 50 ? 2 : 3.5}
                fill={isHovered ? '#FFFFFF' : activeVar.color}
                stroke={isHovered ? activeVar.color : '#0B1D2C'}
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {/* Active Hover Vertical Tracker Line */}
          {hoveredPoint && (
            <line
              x1={getX(hoveredPoint.pres)}
              y1={padTop}
              x2={getX(hoveredPoint.pres)}
              y2={padTop + plotH}
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          )}

          {/* Axis Labels */}
          <text
            x={padLeft + plotW / 2}
            y={svgHeight - 4}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="bold"
          >
            {isDistanceMode ? "Offshore Distance from Shore (km)" : "Ocean Depth / Pressure Level (0 ➔ 2000 dbar)"}
          </text>
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute top-2 right-2 bg-[#0B1D2C]/95 border border-[#2EE6C6]/40 p-2 rounded-lg text-[10px] text-white shadow-xl backdrop-blur-md animate-in fade-in duration-100 flex flex-col gap-0.5 pointer-events-none"
          >
            <div className="text-[#00FFC6] font-bold">
              {isDistanceMode ? `Float #${hoverIndex! + 1}` : `Level ${hoverIndex! + 1} of ${points.length}`}
            </div>
            <div>
              {isDistanceMode ? "Distance" : "Depth"}: <b className="text-white">{hoveredPoint.pres.toFixed(1)} {isDistanceMode ? "km" : "dbar"}</b>
            </div>
            <div>
              {activeVar.label}: <b className="text-[#FF6B4A]">{hoveredPoint.val.toFixed(2)} {activeVar.unit}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
