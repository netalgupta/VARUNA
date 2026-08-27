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
  return {
    version: 8,
    name: "VARUNA Dark Tactical Oceanographic Map",
    sources: {
      "varuna-base-tiles": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "© Esri, HERE, Garmin, OpenStreetMap contributors, VARUNA Marine Command",
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
      // 1. Dark Tactical Raster Base Layer (Black Water, Dark Grey Land, Zero Watermarks)
      {
        id: "base-tiles",
        type: "raster",
        source: "varuna-base-tiles",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": 1.0,
          "raster-contrast": 0.15,
          "raster-saturation": 0.05,
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
      // 6. Biodiversity Species Outer Glow Halo
      {
        id: "biodiversity-halo-layer",
        type: "circle",
        source: "biodiversity",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            6,
            5,
            9,
            8,
            14,
          ],
          "circle-color": "#10b981",
          "circle-opacity": 0.4,
          "circle-blur": 0.6,
        },
      },
      // 7. Biodiversity Species Core Dots (Color-coded by CMLRE Dataset Collection)
      {
        id: "biodiversity-circle-layer",
        type: "circle",
        source: "biodiversity",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            4,
            5,
            6,
            8,
            9,
          ],
          "circle-color": [
            "match",
            ["coalesce", ["get", "dataset_type"], "voucher"],
            "voucher",
            "#10b981",
            "edna",
            "#a855f7",
            "fishery",
            "#f59e0b",
            "marine_mammal",
            "#06b6d4",
            "voucher_referral",
            "#14b8a6",
            "#10b981",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
          "circle-opacity": 0.95,
        },
      },
    ],
  };
}
