"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface AnomalySeriesProps {
  data: any; // { times, values, threshold, anomalies: [indices] }
  variable?: string;
  title?: string;
}

/**
 * Specialized time series for highlighting climate anomalies (e.g. MHWs).
 */
export function AnomalySeries({ data, variable = 'temp', title }: AnomalySeriesProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    const traces: Partial<PlotData>[] = [
      {
        x: data.times,
        y: data.values,
        mode: 'lines',
        name: 'Observation',
        line: { color: '#00F0FF', width: 2 },
        type: 'scatter'
      }
    ];

    // Highlight anomalies
    if (data.anomalies && data.anomalies.length > 0) {
      traces.push({
        x: data.anomalies.map((idx: number) => data.times[idx]),
        y: data.anomalies.map((idx: number) => data.values[idx]),
        mode: 'markers',
        name: 'Anomaly (Alert)',
        marker: { color: '#FF4B2B', size: 8, symbol: 'circle' },
        type: 'scatter'
      });
    }

    return traces;
  }, [data]);

  const layout: Partial<Layout> = {
    title: {
      text: title || `Anomaly Detection: ${variable.toUpperCase()}`,
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
      title: { text: variable.toUpperCase(), font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
    showlegend: true,
    legend: { font: { color: '#94A3B8' } },
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
