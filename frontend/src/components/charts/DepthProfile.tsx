"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface DepthProfileProps {
  data: any[];
  variable?: 'temp' | 'psal' | 'doxy' | 'chla' | string;
  title?: string;
}

/**
 * Horizontal CTD Profile:
 * X-axis: Depth / Pressure (dbar) from surface (0) to deep water (2000m)
 * Y-axis: Measured variable (Temperature °C, Salinity PSU, Dissolved Oxygen µmol/kg)
 */
export function DepthProfile({ data, variable = 'temp', title }: DepthProfileProps) {
  const cleanData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .map((d) => {
        const val = Number(d[variable] ?? d.temp ?? d.temperature ?? d.psal ?? d.salinity ?? d.doxy ?? 0);
        const pres = Number(d.pres ?? d.pressure ?? d.depth ?? 0);
        return { val, pres };
      })
      .filter((d) => !isNaN(d.val) && !isNaN(d.pres) && isFinite(d.val) && isFinite(d.pres))
      .sort((a, b) => a.pres - b.pres);
  }, [data, variable]);

  const varName = useMemo(() => {
    const v = String(variable).toLowerCase();
    if (v.includes('psal') || v.includes('sal')) return 'Salinity (PSU)';
    if (v.includes('doxy') || v.includes('oxy')) return 'Dissolved O₂ (µmol/kg)';
    return 'Water Temperature (°C)';
  }, [variable]);

  const lineColor = useMemo(() => {
    const v = String(variable).toLowerCase();
    if (v.includes('psal') || v.includes('sal')) return '#2BFFBD';
    if (v.includes('doxy') || v.includes('oxy')) return '#00F0FF';
    return '#FF6B4A';
  }, [variable]);

  const plotData = useMemo((): Partial<PlotData>[] => {
    if (cleanData.length === 0) return [];

    // Horizontal Layout: X = Depth/Pressure, Y = Temperature/Salinity
    const traces: Partial<PlotData>[] = [
      {
        x: cleanData.map((d) => d.pres),
        y: cleanData.map((d) => d.val),
        mode: 'lines+markers',
        name: varName,
        line: {
          color: lineColor,
          width: 2.5,
          shape: 'spline',
        },
        marker: {
          size: 6,
          color: lineColor,
          opacity: 0.9,
        },
        fill: 'tozeroy',
        fillcolor: `${lineColor}15`,
        type: 'scatter',
      },
    ];

    return traces;
  }, [cleanData, varName, lineColor]);

  const layout: Partial<Layout> = {
    title: {
      text: title || `${varName} across Water Depth (0 – 2000 dbar)`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif', size: 12 },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(11, 29, 44, 0.4)',
    height: 310,
    autosize: true,
    xaxis: {
      title: {
        text: 'Depth / Pressure Level (dbar) ➔ Deeper Water',
        font: { color: '#94A3B8', size: 11 },
      },
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
      zerolinecolor: 'rgba(255,255,255,0.1)',
    },
    yaxis: {
      title: {
        text: varName,
        font: { color: '#94A3B8', size: 11 },
      },
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
      zerolinecolor: 'rgba(255,255,255,0.1)',
    },
    margin: { l: 55, r: 25, t: 40, b: 45 },
    showlegend: true,
    legend: {
      font: { color: '#94A3B8', size: 10 },
      orientation: 'h',
      x: 0,
      y: 1.15,
    },
    hovermode: 'closest',
  };

  if (cleanData.length === 0) return null;

  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden bg-[#061422]/90 border border-white/10 p-2">
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler
        style={{ width: '100%', height: '310px' }}
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}
