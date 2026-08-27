"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface FloatTrajectoryChartProps {
  data: any[]; // Array of { time, lat, lon, pres }
  title?: string;
}

/**
 * 2D / 3D Trajectory chart for a single ARGO float.
 * Shows the path a float took over time.
 */
export function FloatTrajectoryChart({ data, title }: FloatTrajectoryChartProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data || data.length === 0) return [];

    return [{
      x: data.map(d => d.lon),
      y: data.map(d => d.lat),
      mode: 'lines+markers',
      name: 'Path',
      line: { color: '#00F0FF', width: 2 },
      marker: {
        size: 5,
        color: data.map(d => new Date(d.time).getTime()),
        colorscale: 'Jet',
        showscale: true,
        colorbar: {
          title: { text: 'Time', font: { color: '#94A3B8' } },
          tickfont: { color: '#94A3B8' }
        }
      },
      type: 'scatter'
    }];
  }, [data]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Float Trajectory (Lon-Lat)',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Longitude', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: 'Latitude', font: { color: '#94A3B8' } },
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
