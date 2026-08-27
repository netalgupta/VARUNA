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
          "raster-contrast": 0.1,
          "raster-saturation": 0.2,
        },
      },
      // 2. Marine Heatwave / Hypoxia Polygon Fill
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
      // 3. Marine Heatwave / Hypoxia Dashed Alert Border
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
    ],
  };
}
