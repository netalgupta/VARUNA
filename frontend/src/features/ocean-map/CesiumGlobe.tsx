"use client";

import React from "react";
import { VarunaMap } from "./VarunaMap";

export function CesiumGlobe(props: {
  onHoverCoords?: (coords: { lat: number; lon: number } | null) => void;
  is3DMode?: boolean;
}) {
  return <VarunaMap {...props} />;
}

export { VarunaMap };
