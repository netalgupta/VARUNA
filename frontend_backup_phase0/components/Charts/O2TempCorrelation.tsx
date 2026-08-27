"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface O2TempCorrelationProps {
  data: any; // { temp: [], doxy: [], pres: [] }
  title?: string;
}

/**
 * Oxygen vs Temperature correlation scatter plot.
 * Useful for identifying water mass oxygenation levels.
 */
export function O2TempCorrelation({ data, title }: O2TempCorrelationProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    return [{
      x: data.temp,
      y: data.doxy,
      mode: 'markers',
      name: 'Observations',
      marker: {
        size: 6,
        color: data.pres,
        colorscale: 'Portland', // Good for oxygen gradients
        showscale: true,
        colorbar: {
          title: { text: 'Pressure', font: { color: '#94A3B8' } },
          tickfont: { color: '#94A3B8' }
        }
      },
      type: 'scatter'
    }];
  }, [data]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Oxygen-Temperature Correlation',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Temperature (°C)', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: 'Dissolved Oxygen (μmol/kg)', font: { color: '#94A3B8' } },
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
