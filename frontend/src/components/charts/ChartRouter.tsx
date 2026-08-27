"use client";

import React, { useMemo } from 'react';
import { OceanChart } from './OceanChart';

interface ChartRouterProps {
  vizSpecs?: {
    chart_type?: string | null;
    chart_data?: any;
    x_variable?: string;
    y_variable?: string;
    title?: string;
    [key: string]: any;
  } | Record<string, any> | null;
  rows?: Record<string, any>[] | null;
}

export function ChartRouter({ vizSpecs, rows }: ChartRouterProps) {
  // If neither vizSpecs nor rows are present, render nothing
  if (!vizSpecs && (!rows || rows.length === 0)) {
    return null;
  }

  return (
    <div className="w-full">
      <OceanChart
        rows={rows}
        vizSpecs={vizSpecs}
        title={vizSpecs?.title || "Ocean CTD Horizontal Depth Profile"}
      />
    </div>
  );
}
