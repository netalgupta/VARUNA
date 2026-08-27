"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Surface3DProps {
  data: any; // { x, y, z, lat, lon, pres }
  variable?: string;
  title?: string;
}

/**
 * 3D Surface Plot for ocean variables.
 * Allows visualizing structures like the "Thermocline" in 3D space.
 */
export function Surface3D({ data, variable = 'temp', title }: Surface3DProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    return [{
      z: data.z,
      x: data.x,
      y: data.y,
      type: 'surface',
      colorscale: 'Viridis',
      colorbar: {
        title: { text: variable.toUpperCase(), font: { color: '#94A3B8' } },
        tickfont: { color: '#94A3B8' }
      }
    }];
  }, [data, variable]);

  const layout: any = {
    title: {
      text: title || `3D Surface: ${variable.toUpperCase()}`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    scene: {
      xaxis: { 
        title: { text: 'Longitude', font: { color: '#94A3B8' } },
        gridcolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: '#94A3B8' }
      },
      yaxis: { 
        title: { text: 'Latitude', font: { color: '#94A3B8' } },
        gridcolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: '#94A3B8' }
      },
      zaxis: { 
        title: { text: 'Depth (m)', font: { color: '#94A3B8' } },
        gridcolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: '#94A3B8' },
        autorange: 'reversed'
      },
      backgroundColor: 'rgba(0,0,0,0)',
    },
    margin: { l: 0, r: 0, t: 50, b: 0 },
    autosize: true,
  };

  return (
    <div className="w-full h-full min-h-[500px] glass-card rounded-2xl overflow-hidden p-4">
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler
        className="w-full h-full"
        config={{ displayModeBar: true, responsive: true }}
      />
    </div>
  );
}
