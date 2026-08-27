"use client";

import React from "react";
import { MapLibreOceanMap } from "./MapLibreOceanMap";

export function ThreeGlobe(props: {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}) {
  return <MapLibreOceanMap {...props} />;
}

export { MapLibreOceanMap };
