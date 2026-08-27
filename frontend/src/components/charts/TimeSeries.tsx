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
      .filter((v) => variables.length === 0 || variables.includes(v))
      .map((v) => {
        const color =
          v.includes('sal') || v.includes('psal')
            ? '#2BFFBD'
            : v.includes('doxy') || v.includes('oxy')
            ? '#00F0FF'
            : '#FF6B4A';

        return {
          x: data.times,
          y: data.series[v],
          mode: 'lines+markers',
          name: v.toUpperCase(),
          type: 'scatter',
          line: { width: 2.5, shape: 'spline', color },
          marker: { size: 5, color },
        };
      });
  }, [data, variables]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Ocean Variable Time Series Trajectory',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif', size: 12 },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(11, 29, 44, 0.4)',
    height: 310,
    autosize: true,
    xaxis: {
      title: { text: 'Observation Timestamp / Date', font: { color: '#94A3B8', size: 11 } },
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
    },
    yaxis: {
      title: { text: 'Sensor Value', font: { color: '#94A3B8', size: 11 } },
      gridcolor: 'rgba(255,255,255,0.06)',
      tickfont: { color: '#94A3B8', size: 10 },
    },
    margin: { l: 55, r: 25, t: 40, b: 45 },
    showlegend: true,
    legend: {
      font: { color: '#94A3B8', size: 10 },
      orientation: 'h',
      x: 0,
      y: 1.15,
    },
    hovermode: 'x unified',
  };

  if (!data || !data.series || Object.keys(data.series).length === 0) return null;

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
