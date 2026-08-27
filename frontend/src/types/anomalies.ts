/**
 * Proactive Marine Heatwave & Hypoxia Anomaly Alert Types
 * Directly maps to backend models in `src.ml` (Member 3 - Sahil's ML Engine)
 */

export interface AffectedSpeciesImpact {
  scientific_name: string;
  common_name: string;
  thermal_optimum?: string;
  impact: string;
}

export type AnomalySeverity = "MODERATE" | "STRONG" | "SEVERE" | "CRITICAL" | "EXTREME";
export type AnomalyAlertType = "MARINE_HEATWAVE" | "HYPOXIA" | "SALINITY_ANOMALY";
export type OceanBasin = "arabian_sea" | "bay_of_bengal" | "equatorial_io" | "gulf_of_mannar" | string;

export interface AnomalyAlert {
  id: number;
  alert_type: AnomalyAlertType;
  severity: AnomalySeverity;
  ocean_basin: OceanBasin;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  metric_name: string;
  current_value: number;
  baseline_value: number;
  anomaly_value: number;
  duration_days: number;
  affected_species: AffectedSpeciesImpact[];
  policy_advisory: string;
  created_at: string;
}

export interface MHWForecastRequest {
  ocean_basin: string;
  forecast_days: number;
  lat_range?: [number, number];
  lon_range?: [number, number];
}

export interface MHWTimeSeriesPoint {
  date: string;
  predicted_sst: number;
  anomaly: number;
  ci95_low?: number;
  ci95_high?: number;
}

export interface HotspotCoordinate {
  lat: number;
  lon: number;
  predicted_anomaly: number;
  ci95_half_width?: number;
}

export interface MHWForecastResponse {
  ocean_basin: string;
  forecast_horizon_days: number;
  predicted_mean_anomaly: number;
  max_anomaly_hotspot?: HotspotCoordinate;
  time_series_forecast?: MHWTimeSeriesPoint[];
  forecast_time_series?: MHWTimeSeriesPoint[];
  mhw_probability?: number;
  mhw_declaration_probability?: number;
  confidence_bounds_95?: {
    half_width_deg_c?: number;
    method?: string;
  };
  model_latency_ms?: number;
  data_source?: string;
}

export interface ProfileQCRequest {
  platform_number: number;
  pressures: number[];
  temperatures: number[];
  salinities: number[];
  doxy?: number[];
  chlorophyll?: number[];
}

export interface ProfileQCResponse {
  platform_number: number;
  is_anomalous: boolean;
  reconstruction_mse: number;
  detected_issue?: string | null;
  detected_sensor_issue?: string | null;
  recommended_qc_flag: 1 | 2 | 3 | 4;
  flagged_depth_levels?: number[];
  status_message?: string;
  inference_time_ms?: number;
}
