"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface TimeSeriesProps {
  data: any; // { times: [], series: { temp: [], psal: [], ... } }
  variables?: string[];
  title?: string;
}

/**
 * High-performance Time Series chart for multi-variable oceanographic data.
 */
export function TimeSeries({ data, variables = ['temp'], title }: TimeSeriesProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data || !data.series) return [];

    return Object.keys(data.series)
      .filter(v => variables.includes(v))
      .map(v => ({
        x: data.times,
        y: data.series[v],
        mode: 'lines',
        name: v.toUpperCase(),
        type: 'scatter',
        line: { width: 2, shape: 'spline' }
      }));
  }, [data, variables]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Ocean Variable Time Series',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Time', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: 'Value', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
    showlegend: true,
    legend: { font: { color: '#94A3B8' }, orientation: 'h', y: -0.2 },
    hovermode: 'x unified',
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
