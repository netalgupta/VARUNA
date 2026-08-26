/**
 * INCOIS ARGO Float Fleet & Physical Oceanography Types
 * Directly maps to backend models in `src.database.postgres` and `src.api.routes`
 */

export interface FloatPoint {
  id: string | number;
  wmo_id: string | number;
  lat: number;
  lon: number;
  last_seen: string;
  total_profiles: number;
  status: "active" | "inactive";
}

export interface ActiveFloatSummary {
  wmo_id: number;
  platform_number?: number;
  last_lat: number;
  last_lon: number;
  last_seen: string;
  total_profiles: number;
}

export interface FloatTrajectoryPoint {
  platform_number: number;
  cycle_number: number;
  time: string;
  latitude: number;
  longitude: number;
}

export interface FloatTrajectoryResponse {
  platform_number: number;
  points: FloatTrajectoryPoint[];
}

export interface DepthProfileMeasurement {
  platform_number: number;
  cycle_number?: number;
  direction?: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  depth_m?: number | null;
  pres?: number | null;
  temp?: number | null;
  psal?: number | null;
  doxy?: number | null;
  chla?: number | null;
  nitrate?: number | null;
  ph_in_situ_total?: number | null;
}

export interface DepthProfileResponse {
  platform_number: number;
  cycle?: number | null;
  measurements: DepthProfileMeasurement[];
  deepest_record?: DepthProfileMeasurement | null;
  deepest_cast?: DepthProfileMeasurement | null;
  latest_surface?: DepthProfileMeasurement | null;
}

export interface BasinStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface RegionalStatsResponse {
  region: "arabian_sea" | "bay_of_bengal" | "equatorial_io" | string;
  variable: "temp" | "psal" | "doxy" | "chla" | "nitrate" | string;
  days: number;
  stats: BasinStats;
}
