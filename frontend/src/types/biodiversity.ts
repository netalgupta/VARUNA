/**
 * CMLRE Marine Living Resources & Darwin Core Types
 * Directly maps to backend models in `src.api.routes`
 */

export interface BiodiversityRecord {
  id: number;
  occurrence_id?: string;
  species_id?: string;
  scientific_name: string;
  common_name: string;
  aphia_id: number;
  kingdom: string;
  phylum: string;
  family: string;
  genus?: string;
  latitude: number;
  longitude: number;
  depth_m?: number | null;
  depth_min_m?: number | null;
  depth_max_m?: number | null;
  habitat_zone?: string;
  ecological_response?: string;
  evidence_source?: string;
  event_date: string;
  thermal_range_min_c: number;
  thermal_range_max_c: number;
  salinity_min_psu?: number;
  salinity_max_psu?: number;
  hypoxia_avoidance_threshold_umol_kg?: number;
  dataset_type?: string;
  institution_code: string;
}

export interface EcologicalProfile {
  species_id: string;
  scientific_name: string;
  aphia_id_lsid?: string | null;
  family?: string | null;
  genus?: string | null;
  common_name?: string | null;
  habitat_zone?: string | null;
  depth_min_m?: number | null;
  depth_max_m?: number | null;
  ecological_response?: string | null;
  evidence_source?: string | null;
  temp_pref_min_c?: number | null;
  temp_pref_max_c?: number | null;
  salinity_min_psu?: number | null;
  salinity_max_psu?: number | null;
  hypoxia_avoidance_threshold_umol_kg?: number | null;
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
