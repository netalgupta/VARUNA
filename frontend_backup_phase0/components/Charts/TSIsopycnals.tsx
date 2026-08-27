"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PlotData, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface TSIsopycnalsProps {
  data: any[];
  title?: string;
}

/**
 * T-S Diagram (Temperature vs Salinity) with calculated Sigma-t Isopycnals.
 * Critical tool for physical oceanographers to identify water masses.
 */
export function TSIsopycnals({ data, title }: TSIsopycnalsProps) {
  const plotData = useMemo((): Partial<PlotData>[] => {
    if (!data || data.length === 0) return [];

    // 1. Data Points
    const traces: Partial<PlotData>[] = [{
      x: data.map(d => d.psal),
      y: data.map(d => d.temp),
      mode: 'markers',
      name: 'Observations',
      marker: {
        size: 6,
        color: data.map(d => d.pres), // Color by depth
        colorscale: 'Viridis',
        reversescale: true,
        showscale: true,
        colorbar: {
          title: { 
            text: 'Depth',
            font: { color: '#94A3B8' }
          },
          tickfont: { color: '#94A3B8' },
        }
      },
      type: 'scatter'
    }];

    // 2. Isopycnal lines (simplified sigma-t calculation logic for background grid)
    const sMin = Math.floor(Math.min(...data.map(d => d.psal)) - 1);
    const sMax = Math.ceil(Math.max(...data.map(d => d.psal)) + 1);
    const tMin = Math.floor(Math.min(...data.map(d => d.temp)) - 2);
    const tMax = Math.ceil(Math.max(...data.map(d => d.temp)) + 2);

    const sRange = Array.from({ length: 20 }, (_, i) => sMin + (i * (sMax - sMin) / 19));
    const tRange = Array.from({ length: 20 }, (_, i) => tMin + (i * (tMax - tMin) / 19));

    // For a real app, we'd use TEOS-10 / gsw. Here we use a simplified polynomial for Sig-T
    const calcSigma = (T: number, S: number) => {
      return 28.106 - 0.0735 * T - 0.00469 * T * T + (0.802 - 0.002 * T) * (S - 35);
    };

    // Generate contour lines (Iso-density)
    [24, 25, 26, 27, 28].forEach(sig => {
      const x: number[] = [];
      const y: number[] = [];
      sRange.forEach(s => {
        // Solve for T: simplified reversal
        tRange.forEach(t => {
          if (Math.abs(calcSigma(t, s) - sig) < 0.1) {
            x.push(s);
            y.push(t);
          }
        });
      });
      
      if (x.length > 0) {
        traces.push({
          x, y,
          mode: 'lines',
          name: `σ=${sig}`,
          line: { color: 'rgba(255,255,255,0.1)', dash: 'dot', width: 1 },
          showlegend: false,
          hoverinfo: 'skip'
        });
      }
    });

    return traces;
  }, [data]);

  const layout: Partial<Layout> = {
    title: {
      text: title || 'T-S Diagram (Isopycnals)',
      font: { color: '#E2E8F0', family: 'Inter, sans-serif' },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    xaxis: {
      title: { 
        text: 'Salinity (PSU)',
        font: { color: '#94A3B8' }
      },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    yaxis: {
      title: { 
        text: 'Temperature (°C)',
        font: { color: '#94A3B8' }
      },
      gridcolor: 'rgba(255,255,255,0.05)',
      tickfont: { color: '#94A3B8' },
    },
    margin: { l: 60, r: 20, t: 60, b: 60 },
    showlegend: true,
    legend: { font: { color: '#94A3B8' } },
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
