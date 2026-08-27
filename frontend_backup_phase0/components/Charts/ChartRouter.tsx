"use client";

import React from 'react';
import { DepthProfile } from './DepthProfile';
import { TSIsopycnals } from './TSIsopycnals';
import { HovmollerDiagram } from './HovmollerDiagram';
import { Surface3D } from './Surface3D';
import { AnomalySeries } from './AnomalySeries';
import { SeasonalBoxplots } from './SeasonalBoxplots';
import { WindRose } from './WindRose';
import { TimeSeries } from './TimeSeries';
import { O2TempCorrelation } from './O2TempCorrelation';
import { ChlaNitrateScatter } from './ChlaNitrateScatter';
import { FloatTrajectoryChart } from './FloatTrajectoryChart';

interface ChartRouterProps {
  vizSpecs: {
    chart_type: string | null;
    chart_data: any;
  };
}

export function ChartRouter({ vizSpecs }: ChartRouterProps) {
  const { chart_type, chart_data } = vizSpecs;

  if (!chart_type || !chart_data) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted italic text-sm">
        No specific visualization for this query.
      </div>
    );
  }

  // Map backend chart_type to frontend components
  switch (chart_type) {
    case 'depth_profile':
      /**
       * Backend returns: { profiles: { pid: [{depth, temp, ...}] } }
       * Use first profile for now in the simple router
       */
      const pids = Object.keys(chart_data.profiles || {});
      if (pids.length === 0) return null;
      return <DepthProfile data={chart_data.profiles[pids[0]]} title={`Float ${pids[0]} Profile`} />;

    case 'ts_isopycnals':
      /**
       * Backend returns: { temp: [], psal: [], pres: [] }
       * Reformat to array of points
       */
      const tsData = chart_data.temp.map((t: number, i: number) => ({
        temp: t,
        psal: chart_data.psal[i],
        pres: chart_data.pres ? chart_data.pres[i] : 0
      }));
      return <TSIsopycnals data={tsData} />;

    case 'hovmoller_diagram':
      return <HovmollerDiagram data={chart_data} />;

    case 'surface_3d':
      return <Surface3D data={chart_data} />;

    case 'anomaly_series':
      return <AnomalySeries data={chart_data} />;

    case 'seasonal_boxplots':
      return <SeasonalBoxplots data={chart_data} />;

    case 'wind_rose':
      return <WindRose data={chart_data} />;

    case 'time_series':
      return <TimeSeries data={chart_data} />;

    case 'o2_temp_correlation':
      return <O2TempCorrelation data={chart_data} />;

    case 'chla_nitrate_scatter':
      return <ChlaNitrateScatter data={chart_data} />;

    case 'float_trajectory':
      return <FloatTrajectoryChart data={chart_data} />;

    default:
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
          <p className="text-sm font-medium">Visualization: {chart_type.toUpperCase()}</p>
          <pre className="text-[10px] opacity-50 overflow-auto max-h-40 max-w-full">
            {JSON.stringify(chart_data, null, 2)}
          </pre>
        </div>
      );
  }
}
