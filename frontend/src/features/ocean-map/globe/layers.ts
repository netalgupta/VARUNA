/**
 * VARUNA Custom Geospatial Globe Layer Builders
 * Authoritative WGS84 Coordinate Entity Builders for CesiumJS
 */

import type { ActiveFloatSummary } from "@/types/argo";
import type { AnomalyAlert } from "@/types/anomalies";
import type { BiodiversityRecord } from "@/types/biodiversity";

export interface BuildLayersOptions {
  Cesium: any;
  viewer: any;
  floats: ActiveFloatSummary[];
  biodiversity: BiodiversityRecord[];
  anomalies: AnomalyAlert[];
  mapLayers: {
    argoFloats: boolean;
    biodiversity: boolean;
    heatwaves: boolean;
    hypoxia: boolean;
    satellites?: boolean;
    sensors?: boolean;
    trajectories?: boolean;
  };
  selectedFloatId: string | null;
  selectedAlertId: number | null;
}

export function renderVarunaGeospatialEntities({
  Cesium,
  viewer,
  floats,
  biodiversity,
  anomalies,
  mapLayers,
  selectedFloatId,
  selectedAlertId,
}: BuildLayersOptions) {
  if (!viewer || !Cesium) return;

  // Clear previous dynamic operational entities
  viewer.entities.removeAll();

  // ── 1. ARGO Float Fleet (Precise WGS84 Coordinates) ──────────────────────
  if (mapLayers.argoFloats && floats && floats.length > 0) {
    floats.forEach((f) => {
      const isSelected = String(f.wmo_id) === selectedFloatId;
      const pointColor = isSelected
        ? Cesium.Color.fromCssColorString("#00FFC6")
        : Cesium.Color.fromCssColorString("#2EE6C6");

      viewer.entities.add({
        id: `argo-${f.wmo_id}`,
        name: `ARGO Float #${f.wmo_id}`,
        position: Cesium.Cartesian3.fromDegrees(f.last_lon, f.last_lat, 2000),
        point: {
          pixelSize: isSelected ? 13 : 7,
          color: pointColor,
          outlineColor: isSelected
            ? Cesium.Color.WHITE
            : Cesium.Color.fromCssColorString("#020B14"),
          outlineWidth: isSelected ? 2.5 : 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure clean visibility above basemap
        },
        label: isSelected
          ? {
              text: `ARGO #${f.wmo_id}\n${f.last_lat.toFixed(2)}°N, ${f.last_lon.toFixed(2)}°E`,
              font: "bold 11px JetBrains Mono, monospace",
              fillColor: Cesium.Color.fromCssColorString("#00FFC6"),
              outlineColor: Cesium.Color.fromCssColorString("#020B14"),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -12),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }
          : undefined,
        entityType: "ARGO",
        wmoId: f.wmo_id,
        latitude: f.last_lat,
        longitude: f.last_lon,
      });

      // If selected, add an operational pulse beacon ring
      if (isSelected) {
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(f.last_lon, f.last_lat, 1000),
          ellipse: {
            semiMinorAxis: 45000.0, // 45 km radius
            semiMajorAxis: 45000.0,
            material: Cesium.Color.fromCssColorString("rgba(0, 255, 198, 0.18)"),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#00FFC6"),
            outlineWidth: 1.5,
          },
        });
      }
    });
  }

  // ── 2. CMLRE Marine Living Resources (Biodiversity Points) ───────────────
  if (mapLayers.biodiversity && biodiversity && biodiversity.length > 0) {
    biodiversity.forEach((b) => {
      viewer.entities.add({
        id: `bio-${b.id}`,
        name: b.scientific_name,
        position: Cesium.Cartesian3.fromDegrees(b.longitude, b.latitude, 1500),
        point: {
          pixelSize: 5,
          color: Cesium.Color.fromCssColorString("#1ECBE1"),
          outlineColor: Cesium.Color.fromCssColorString("#020B14"),
          outlineWidth: 1.2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        entityType: "BIODIVERSITY",
        speciesName: b.scientific_name,
        commonName: b.common_name,
        latitude: b.latitude,
        longitude: b.longitude,
      });
    });
  }

  // ── 3. Marine Heatwaves & Hypoxia Zones (Geographic Polygons) ───────────
  if ((mapLayers.heatwaves || mapLayers.hypoxia) && anomalies && anomalies.length > 0) {
    anomalies.forEach((a) => {
      const isMHW = a.alert_type === "MARINE_HEATWAVE";
      if (isMHW && !mapLayers.heatwaves) return;
      if (!isMHW && !mapLayers.hypoxia) return;

      const isSelected = a.id === selectedAlertId;
      const fillColor = isMHW
        ? Cesium.Color.fromCssColorString(
            isSelected ? "rgba(255, 75, 75, 0.35)" : "rgba(255, 75, 75, 0.20)"
          )
        : Cesium.Color.fromCssColorString(
            isSelected ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.20)"
          );

      const outlineColor = isMHW
        ? Cesium.Color.fromCssColorString("#FF4B4B")
        : Cesium.Color.fromCssColorString("#F59E0B");

      // Bounding Polygon/Rectangle from backend coordinates
      viewer.entities.add({
        id: `anomaly-${a.id}`,
        name: isMHW ? `Marine Heatwave #${a.id}` : `Hypoxia Zone #${a.id}`,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            a.lon_min,
            a.lat_min,
            a.lon_max,
            a.lat_max
          ),
          material: fillColor,
          outline: true,
          outlineColor: outlineColor,
          outlineWidth: isSelected ? 2.5 : 1.5,
        },
        entityType: "ANOMALY",
        alertId: a.id,
      });

      // Centered Operational Telemetry Marker & Tag
      const centerLat = (a.lat_min + a.lat_max) / 2;
      const centerLon = (a.lon_min + a.lon_max) / 2;

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 8000),
        point: {
          pixelSize: 8,
          color: outlineColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: isMHW ? `MHW +${a.anomaly_value}°C` : `HYPOXIA OMZ`,
          font: "bold 10px JetBrains Mono, monospace",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString("#020B14"),
          outlineWidth: 2.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        entityType: "ANOMALY",
        alertId: a.id,
      });
    });
  }
}
