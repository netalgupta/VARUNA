"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface FloatTrajectoryChartProps {
  data: any[];
  title?: string;
}

/**
 * 2D Trajectory chart for a single ARGO float.
 * Shows the path a float took across cycles.
 */
export function FloatTrajectoryChart({ data, title }: FloatTrajectoryChartProps) {
  const cleanData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .map((d) => ({
        lat: Number(d.lat ?? d.latitude),
        lon: Number(d.lon ?? d.longitude),
        time: d.time ?? d.date ?? d.timestamp ?? '',
      }))
      .filter((d) => !isNaN(d.lat) && !isNaN(d.lon) && isFinite(d.lat) && isFinite(d.lon));
  }, [data]);

  const plotData = useMemo((): Partial<PlotData>[] => {
    if (cleanData.length === 0) return [];

    return [
      {
        x: cleanData.map((d) => d.lon),
        y: cleanData.map((d) => d.lat),
        mode: 'lines+markers',
        name: 'Float Path',
        line: { color: '#00F0FF', width: 2.5 },
        marker: {
          size: 7,
          color: '#2EE6C6',
        },
        type: 'scatter',
      },
    ];
  }, [cleanData]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Float Trajectory (Longitude vs Latitude)',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Longitude (°E)', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: 'Latitude (°N)', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 50, b: 50 },
    hovermode: 'closest',
    autosize: true,
  };

  if (cleanData.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[360px] glass-card rounded-2xl overflow-hidden p-3">
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
