"use client";

import React from "react";
import { VarunaMap } from "./VarunaMap";
export { BASIN_PRESETS } from "@/config/map";

export function MapLibreOceanMap(props: {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}) {
  return <VarunaMap {...props} />;
}

export { VarunaMap };
