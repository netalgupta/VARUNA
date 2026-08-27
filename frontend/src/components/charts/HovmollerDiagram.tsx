"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface HovmollerDiagramProps {
  data: any[]; // Expects array of {time, pres, val}
  variable?: string;
  title?: string;
}

/**
 * Hovmöller Diagram: Time (X) vs Depth/Pressure (Y).
 * Visualizes seasonal cycles and depth penetration of signals.
 */
export function HovmollerDiagram({ data, variable = 'temp', title }: HovmollerDiagramProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data || data.length === 0) return [];

    // Extract unique times and pressures
    const times = Array.from(new Set(data.map((d) => new Date(d.time).getTime()))).sort();
    const pressures = Array.from(new Set(data.map((d) => Number(d.pres ?? d.pressure ?? d.depth ?? 0)))).sort((a, b) => a - b);

    // Create Z grid
    const z: any[][] = pressures.map((p) => {
      return times.map((t) => {
        const found = data.find(
          (d) =>
            new Date(d.time).getTime() === t &&
            Number(d.pres ?? d.pressure ?? d.depth ?? 0) === p
        );
        if (!found) return null;
        const v = found[variable] ?? found.val ?? found.value;
        return v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : null;
      });
    });

    const isTemp = variable === 'temp' || variable === 'temperature';
    const isPsal = variable === 'psal' || variable === 'salinity';
    const isDoxy = variable === 'doxy' || variable === 'oxygen';

    let colorscale = 'YlOrRd';
    if (isPsal) colorscale = 'Viridis';
    if (isDoxy) colorscale = 'Tealgrn';

    return [
      {
        z,
        x: times.map((t) => new Date(t).toISOString().split('T')[0]),
        y: pressures,
        type: 'heatmap',
        zsmooth: 'best',
        colorscale: colorscale as any,
        colorbar: {
          title: {
            text: isTemp ? 'Temp (°C)' : isPsal ? 'Salinity (PSU)' : 'DOXY (µmol/kg)',
            font: { color: '#94A3B8', size: 10 },
          },
          tickfont: { color: '#94A3B8', size: 9 },
          len: 0.8,
        },
      },
    ];
  }, [data, variable]);

  const isTemp = variable === 'temp' || variable === 'temperature';
  const isPsal = variable === 'psal' || variable === 'salinity';

  const layout: Partial<Layout> = {
    title: {
      text: title || `Hovmöller Spatio-Temporal Depth Evolution (${isTemp ? 'SST & Thermocline °C' : isPsal ? 'Salinity PSU' : 'DOXY µmol/kg'})`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif', size: 12 },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(11, 29, 44, 0.4)',
    height: 310,
    autosize: true,
    xaxis: {
      title: {
        text: 'Observation Timeline (2026)',
        font: { color: '#94A3B8', size: 11 },
      },
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
    },
    yaxis: {
      title: {
        text: 'Depth / Pressure (dbar)',
        font: { color: '#94A3B8', size: 11 },
      },
      autorange: 'reversed',
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
    },
    margin: { l: 55, r: 25, t: 40, b: 45 },
    hovermode: 'closest',
  };

  if (plotData.length === 0) return null;

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
