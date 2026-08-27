"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface SeasonalBoxplotsProps {
  data: any; // { months: [], series: { temp: [], ... } }
  variable?: string;
  title?: string;
}

/**
 * Seasonal Boxplots to visualize monthly variability and outliers.
 */
export function SeasonalBoxplots({ data, variable = 'temp', title }: SeasonalBoxplotsProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data) return [];

    // Grouping values by month
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return months.map((m, i) => {
      const monthIndex = i + 1;
      const values = data.series[variable]?.filter((_: any, idx: number) => {
        const d = new Date(data.months[idx]);
        return d.getMonth() + 1 === monthIndex;
      }) || [];

      return {
        y: values,
        type: 'box',
        name: m,
        boxpoints: 'outliers',
        marker: { color: i < 3 || i > 9 ? '#00F0FF' : '#FF4B2B' }, // Color by season (approx)
        line: { width: 1 }
      };
    });
  }, [data, variable]);

  const layout: Partial<Layout> = {
    title: {
      text: title || `Seasonal Variability: ${variable.toUpperCase()}`,
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { text: 'Month', font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { text: variable.toUpperCase(), font: { color: '#94A3B8' } },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
    showlegend: false,
    autosize: true,
  };

  return (
    <div className="w-full h-full min-h-[400px] glass-card rounded-2xl overflow-hidden p-4">
      <Plot
        data={plotData as any}
        layout={layout}
        useResizeHandler
        className="w-full h-full"
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}
