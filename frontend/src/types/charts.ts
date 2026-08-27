/**
 * Plotly & Scientific Oceanographic Visualization Types
 */

export interface PlotlyDataSeries {
  x?: any[];
  y?: any[];
  z?: any[];
  type?: string;
  mode?: string;
  name?: string;
  marker?: Record<string, any>;
  line?: Record<string, any>;
  text?: string[];
  hovertemplate?: string;
  [key: string]: any;
}

export interface PlotlyChartLayout {
  title?: string | { text: string; font?: Record<string, any> };
  xaxis?: Record<string, any>;
  yaxis?: Record<string, any>;
  zaxis?: Record<string, any>;
  paper_bgcolor?: string;
  plot_bgcolor?: string;
  margin?: { l?: number; r?: number; t?: number; b?: number };
  autosize?: boolean;
  showlegend?: boolean;
  legend?: Record<string, any>;
  font?: Record<string, any>;
  [key: string]: any;
}

export interface VizSpec {
  chart_type:
    | "time_series"
    | "depth_profile"
    | "hovmoller_contour"
    | "ts_diagram"
    | "anomaly_series"
    | "surface_3d"
    | "wind_rose"
    | "correlation_scatter"
    | "seasonal_boxplot"
    | string;
  title?: string;
  x_variable?: string;
  y_variable?: string;
  z_variable?: string;
  data?: PlotlyDataSeries[];
  layout?: PlotlyChartLayout;
}
