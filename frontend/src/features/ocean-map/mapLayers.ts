import type { ActiveFloatSummary } from "@/types/argo";
import type { BiodiversityRecord } from "@/types/biodiversity";
import type { AnomalyAlert } from "@/types/anomalies";

export const MAP_LAYERS = {
  BASE_TILES: "base-tiles",
  ARGO_FLOATS: "argo-floats-layer",
  ARGO_FLOATS_HALO: "argo-floats-halo-layer",
  BIODIVERSITY: "biodiversity-layer",
  ANOMALIES_FILL: "anomalies-fill-layer",
  ANOMALIES_LINE: "anomalies-line-layer",
} as const;

/**
 * Transforms backend ARGO Floats to GeoJSON FeatureCollection
 */
export function floatsToGeoJSON(floats: ActiveFloatSummary[], selectedFloatId: string | null) {
  const validFeatures = (floats || [])
    .map((f: any) => {
      const lon = Number(f.last_lon ?? f.longitude ?? f.lon);
      const lat = Number(f.last_lat ?? f.latitude ?? f.lat);
      const id = String(f.wmo_id ?? f.platform_number ?? f.id ?? "");

      if (isNaN(lon) || isNaN(lat)) return null;

      return {
        type: "Feature" as const,
        properties: {
          id: id,
          wmo_id: f.wmo_id ?? f.platform_number,
          platform_number: f.platform_number ?? f.wmo_id,
          total_profiles: f.total_profiles ?? 100,
          last_seen: f.last_seen ?? "2026-08-20",
          isSelected: id === String(selectedFloatId),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [lon, lat] as [number, number],
        },
      };
    })
    .filter(Boolean) as any[];

  return {
    type: "FeatureCollection" as const,
    features: validFeatures,
  };
}

/**
 * Transforms backend CMLRE Biodiversity to GeoJSON FeatureCollection
 */
export function biodiversityToGeoJSON(biodiversity: BiodiversityRecord[]) {
  const validFeatures = (biodiversity || [])
    .map((b: any) => {
      const lon = Number(b.longitude ?? b.lon ?? b.decimal_longitude);
      const lat = Number(b.latitude ?? b.lat ?? b.decimal_latitude);

      if (isNaN(lon) || isNaN(lat)) return null;

      return {
        type: "Feature" as const,
        properties: {
          id: b.id ?? b.occurrence_id,
          occurrence_id: b.occurrence_id || `CMLRE_${b.id}`,
          name: b.scientific_name,
          scientific_name: b.scientific_name,
          common_name: b.common_name || b.scientific_name,
          family: b.family || "Marine Taxa",
          genus: b.genus || b.scientific_name.split(" ")[0],
          dataset_type: b.dataset_type || "voucher",
          depth_m: b.depth_m ?? 20,
          event_date: b.event_date || "2024-01-01",
          thermal_min: b.thermal_range_min_c || 22.0,
          thermal_max: b.thermal_range_max_c || 28.0,
          salinity_min: b.salinity_min_psu || 34.0,
          salinity_max: b.salinity_max_psu || 36.5,
          hypoxia_threshold: b.hypoxia_avoidance_threshold_umol_kg || 45.0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [lon, lat] as [number, number],
        },
      };
    })
    .filter(Boolean) as any[];

  return {
    type: "FeatureCollection" as const,
    features: validFeatures,
  };
}

/**
 * Transforms backend Marine Heatwave and Hypoxia Alerts to GeoJSON FeatureCollection
 */
export function anomaliesToGeoJSON(
  anomalies: AnomalyAlert[],
  selectedAlertId: number | null,
  layers: { heatwaves: boolean; hypoxia: boolean }
) {
  const filtered = (anomalies || []).filter((a) => {
    if (a.alert_type === "MARINE_HEATWAVE") return layers.heatwaves;
    return layers.hypoxia;
  });

  return {
    type: "FeatureCollection" as const,
    features: filtered.map((a) => ({
      type: "Feature" as const,
      properties: {
        id: a.id,
        alertType: a.alert_type,
        anomalyValue: a.anomaly_value,
        severity: a.severity,
        oceanBasin: a.ocean_basin,
        isSelected: a.id === selectedAlertId,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [a.lon_min, a.lat_min],
            [a.lon_max, a.lat_min],
            [a.lon_max, a.lat_max],
            [a.lon_min, a.lat_max],
            [a.lon_min, a.lat_min],
          ],
        ],
      },
    })),
  };
}
