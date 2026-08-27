/**
 * ARGO Physical Oceanography API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  ActiveFloatSummary,
  FloatTrajectoryResponse,
  DepthProfileResponse,
  RegionalStatsResponse,
} from "@/types/argo";

export async function getFloats(limit = 100): Promise<ActiveFloatSummary[]> {
  const res = await apiClient<any>(ENDPOINTS.FLOATS, {
    params: { limit },
  });
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.floats)) return res.floats;
  return [];
}

export async function getFloatTrajectory(
  platformNumber: number | string,
  days = 365
): Promise<FloatTrajectoryResponse> {
  const res = await apiClient<any>(
    ENDPOINTS.TRAJECTORY(platformNumber),
    { params: { days } }
  );
  if (res && Array.isArray(res.points)) return res;
  if (Array.isArray(res)) return { platform_number: Number(platformNumber), points: res };
  return { platform_number: Number(platformNumber), points: [] };
}

export async function getDepthProfile(
  platformNumber: number | string,
  cycle?: number
): Promise<DepthProfileResponse> {
  const res = await apiClient<any>(ENDPOINTS.PROFILE(platformNumber), {
    params: { cycle },
  });

  // Normalize: backend returns `depth_m` (aliased from `pres`), frontend expects `depth`
  const normalizeMeasurements = (measurements: any[]): any[] => {
    if (!Array.isArray(measurements)) return [];
    return measurements.map((m: any) => ({
      ...m,
      depth: m.depth ?? m.depth_m ?? m.pres ?? 0,
    }));
  };

  if (res && Array.isArray(res.measurements)) {
    return { ...res, measurements: normalizeMeasurements(res.measurements) };
  }
  if (Array.isArray(res)) {
    return { platform_number: Number(platformNumber), measurements: normalizeMeasurements(res) };
  }
  return { platform_number: Number(platformNumber), measurements: [] };
}

export async function getBasinStats(
  region = "arabian_sea",
  variable = "temp",
  days = 30
): Promise<RegionalStatsResponse> {
  return apiClient<RegionalStatsResponse>(ENDPOINTS.STATS, {
    params: { region, variable, days },
  });
}
