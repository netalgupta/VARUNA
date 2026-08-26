import { MAP_CONFIG } from "@/config/map";
import type { StyleSpecification } from "maplibre-gl";

/**
 * VARUNA 2D Tactical Oceanographic Command Center Map Style:
 * - Deep navy ocean base (#061325 / #091a30)
 * - Dark blue/gray tactical landmasses with visible borders
 * - Crisp ocean typography & coastal contours
 * - GeoJSON layers for anomalies and overlays
 */
export function getVarunaMapStyle(theme: "dark" | "voyager" = "dark"): StyleSpecification {
  const subdomains = ["a", "b", "c", "d"];
  const tileTheme = theme === "voyager" ? "voyager" : "dark_all";

  return {
    version: 8,
    name: "VARUNA Dark Navy Tactical Marine Map",
    sources: {
      "varuna-base-tiles": {
        type: "raster",
        tiles: subdomains.map(
          (s) => `https://${s}.basemaps.cartocdn.com/rastertiles/${tileTheme}/{z}/{x}/{y}@2x.png`
        ),
        tileSize: 256,
        attribution: "© OpenStreetMap contributors, © CARTO, VARUNA Operational Command",
      },
      "anomalies": {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
      "argo-floats": {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
      "biodiversity": {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
      "trajectory": {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      // 1. Dark Navy Raster Base Layer
      {
        id: "base-tiles",
        type: "raster",
        source: "varuna-base-tiles",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": 1.0,
          "raster-contrast": 0.15,
          "raster-saturation": 0.1,
        },
      },
      // 2. Trajectory Glow Outer Halo
      {
        id: "trajectory-glow-layer",
        type: "line",
        source: "trajectory",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 6,
          "line-blur": 3,
          "line-opacity": 0.4,
        },
      },
      // 3. Trajectory Cyan Dashed Core Line
      {
        id: "trajectory-line-layer",
        type: "line",
        source: "trajectory",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 2,
          "line-dasharray": [3, 2],
          "line-opacity": 0.95,
        },
      },
      // 4. Marine Heatwave / Hypoxia Polygon Fill
      {
        id: "anomalies-fill-layer",
        type: "fill",
        source: "anomalies",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "alertType"], "MARINE_HEATWAVE"],
            "#EF4444",
            "#F59E0B",
          ],
          "fill-opacity": 0.3,
        },
      },
      // 5. Marine Heatwave / Hypoxia Dashed Alert Border
      {
        id: "anomalies-line-layer",
        type: "line",
        source: "anomalies",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "alertType"], "MARINE_HEATWAVE"],
            "#FF4B4B",
            "#FBBF24",
          ],
          "line-width": 2.5,
          "line-dasharray": [3, 2],
          "line-opacity": 0.95,
        },
      },
      // 6. ARGO Floats Outer Glow Halo
      {
        id: "argo-floats-halo-layer",
        type: "circle",
        source: "argo-floats",
        paint: {
          "circle-radius": [
            "case",
            ["get", "isSelected"],
            14,
            7,
          ],
          "circle-color": "#00e5ff",
          "circle-opacity": 0.35,
          "circle-blur": 0.8,
        },
      },
      // 7. ARGO Floats Inner Core Dot
      {
        id: "argo-floats-circle-layer",
        type: "circle",
        source: "argo-floats",
        paint: {
          "circle-radius": [
            "case",
            ["get", "isSelected"],
            6,
            3.5,
          ],
          "circle-color": [
            "case",
            ["get", "isSelected"],
            "#ffffff",
            "#00e5ff",
          ],
          "circle-stroke-color": "#030a16",
          "circle-stroke-width": 1.5,
        },
      },
      // 8. Biodiversity Species Dots
      {
        id: "biodiversity-circle-layer",
        type: "circle",
        source: "biodiversity",
        paint: {
          "circle-radius": 4,
          "circle-color": "#10b981",
          "circle-stroke-color": "#030a16",
          "circle-stroke-width": 1.5,
        },
      },
    ],
  };
}
