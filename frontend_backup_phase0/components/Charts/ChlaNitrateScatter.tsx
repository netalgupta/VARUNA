"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChlaNitrateScatterProps {
  data: any; // { x: [], y: [], platform: [] }
  title?: string;
}

/**
 * Chlorophyll-a vs Nitrate scatter plot for BGC-Argo researchers.
 * Helps identify nutrient-limited vs light-limited growth.
 */
export function ChlaNitrateScatter({ data, title }: ChlaNitrateScatterProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    return [{
      x: data.x,
      y: data.y,
      mode: 'markers',
      name: 'Observations',
      text: data.platform,
      marker: {
        size: 7,
        color: '#00F0FF',
        opacity: 0.7,
        line: { width: 1, color: 'white' }
      },
      type: 'scatter'
    }];
  }, [data]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'Chl-a vs Nitrate Correlation',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Chlorophyll-a (mg/m³)', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: 'Nitrate (μmol/kg)', font: { color: '#94A3B8' } },
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
