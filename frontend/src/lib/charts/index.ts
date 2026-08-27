/**
 * Scientific Chart Styling & Plotly Layout Tokens
 */

import type { PlotlyChartLayout } from "@/types/charts";

export const BASE_PLOTLY_LAYOUT: Partial<PlotlyChartLayout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: {
    family: "JetBrains Mono, monospace",
    size: 11,
    color: "#94A3B8",
  },
  margin: { l: 48, r: 24, t: 32, b: 40 },
  autosize: true,
  showlegend: true,
  legend: {
    orientation: "h",
    yanchor: "bottom",
    y: 1.02,
    xanchor: "right",
    x: 1,
    font: { size: 10, color: "#94A3B8" },
  },
  xaxis: {
    gridcolor: "rgba(255, 255, 255, 0.06)",
    zerolinecolor: "rgba(255, 255, 255, 0.1)",
    tickfont: { size: 10, color: "#64748B" },
  },
  yaxis: {
    gridcolor: "rgba(255, 255, 255, 0.06)",
    zerolinecolor: "rgba(255, 255, 255, 0.1)",
    tickfont: { size: 10, color: "#64748B" },
  },
};
