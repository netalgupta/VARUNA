/**
 * CMLRE Marine Living Resources & Darwin Core Types
 * Directly maps to backend models in `src.api.routes`
 */

export interface BiodiversityRecord {
  id: number;
  scientific_name: string;
  common_name: string;
  aphia_id: number;
  kingdom: string;
  phylum: string;
  family: string;
  latitude: number;
  longitude: number;
  depth_m?: number | null;
  event_date: string;
  thermal_range_min_c: number;
  thermal_range_max_c: number;
  institution_code: string;
}

export interface SpatialCorrelationRecord {
  species_name: string;
  common_name: string;
  bio_lat: number;
  bio_lon: number;
  bio_date: string;
  nearest_float_wmo: number;
  float_lat: number;
  float_lon: number;
  float_time: string;
  spatial_distance_km: number;
  temporal_delta_days: number;
  in_situ_temperature: number;
  in_situ_salinity: number;
  in_situ_doxy: number;
  thermal_stress_delta: number;
}
