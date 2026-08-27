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

    // Sort and pivot data for Heatmap
    // Simplified: assume data is already bucketed or we just plot as a Scatter/Heatmap
    // For a true Hovmoller, we'd need a grid. Let's use a 3D Mesh or Heatmap.
    
    // Extract unique times and pressures
    const times = Array.from(new Set(data.map(d => new Date(d.time).getTime()))).sort();
    const pressures = Array.from(new Set(data.map(d => d.pres))).sort((a,b) => a - b);

    // Create Z grid
    const z: any[][] = pressures.map(p => {
      return times.map(t => {
        const found = data.find(d => new Date(d.time).getTime() === t && d.pres === p);
        return found ? found[variable] : null;
      });
    });

    return [{
      z,
      x: times.map(t => new Date(t).toISOString().split('T')[0]),
      y: pressures,
      type: 'heatmap',
      colorscale: variable === 'temp' ? 'YlOrRd' : 'Blues',
      colorbar: {
        title: { 
          text: variable.toUpperCase(),
          font: { color: '#94A3B8' }
        },
        tickfont: { color: '#94A3B8' },
      }
    }];
  }, [data, variable]);

  const layout: Partial<Layout> = {
    title: {
      text: title || `Hovmöller Diagram: ${variable.toUpperCase()} Evolution`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { 
        text: 'Time',
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
      autorange: 'reversed',
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
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
