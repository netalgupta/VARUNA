"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface DepthProfileProps {
  data: any[];
  variable?: 'temp' | 'psal' | 'doxy' | 'chla';
  title?: string;
}

export function DepthProfile({ data, variable = 'temp', title }: DepthProfileProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data || data.length === 0) return [];

    // Group by cycle if multiple cycles present, otherwise single profile
    const traces: Partial<PlotData>[] = [{
      x: data.map(d => d[variable]),
      y: data.map(d => d.pres),
      mode: 'lines+markers',
      name: variable.toUpperCase(),
      line: {
        color: variable === 'temp' ? '#FF4B2B' : variable === 'psal' ? '#2BFFBD' : '#00F0FF',
        width: 2,
        shape: 'spline'
      },
      marker: {
        size: 4,
        opacity: 0.6
      },
      type: 'scatter'
    }];

    return traces;
  }, [data, variable]);

  const layout: Partial<Layout> = {
    title: {
      text: title || `${variable.toUpperCase()} vs Depth (Pressure)`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { 
        text: variable.toUpperCase(),
        font: { color: '#94A3B8' }
      },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { 
        text: 'Pressure (dbar)',
        font: { color: '#94A3B8' }
      },
      autorange: 'reversed', // High pressure is deeper
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
    showlegend: true,
    legend: { font: { color: '#94A3B8' } },
    hovermode: 'closest',
    autosize: true,
  };

  return (
    <div className="w-full h-full min-h-[400px] glass-card rounded-2xl overflow-hidden p-4">
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler
        className="w-full h-full"
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}
