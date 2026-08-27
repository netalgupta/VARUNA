"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface WindRoseProps {
  data: any; // { directions: [], speeds: [] } or { u: [], v: [] }
  title?: string;
}

/**
 * Wind Rose (Polar Plot) for currents or wind vectors.
 */
export function WindRose({ data, title }: WindRoseProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    // Simplified: aggregate by 16 directions
    const bins = 16;
    const step = 360 / bins;
    const r = Array(bins).fill(0);
    const theta = Array(bins).fill(0).map((_, i) => i * step);

    data.directions.forEach((d: number, i: number) => {
      const b = Math.floor(d / step) % bins;
      r[b] += data.speeds[i];
    });

    return [{
      r: r,
      theta: theta,
      type: 'barpolar',
      name: 'Current Intensity',
      marker: {
        color: r,
        colorscale: 'YlGnBu',
        line: { color: 'white' }
      }
    }];
  }, [data]);

  const layout: any = {
    title: {
      text: title || 'Current Vector distribution (Wind Rose)',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    polar: {
      bgcolor: 'rgba(15, 23, 42, 0.5)',
      angularaxis: {
        tickfont: { size: 10, color: '#94A3B8' },
        rotation: 90,
        direction: "clockwise"
      },
      radialaxis: {
        tickfont: { size: 10, color: '#94A3B8' },
        gridcolor: 'rgba(255,255,255,0.05)'
      }
    },
    margin: { l: 40, r: 40, t: 60, b: 40 },
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
