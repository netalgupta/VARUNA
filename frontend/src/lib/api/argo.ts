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


const trajectoryCache = new Map<string, FloatTrajectoryResponse>();
const statsCache = new Map<string, RegionalStatsResponse>();
let floatsCache: { data: ActiveFloatSummary[]; timestamp: number } | null = null;

export async function getFloats(limit = 100): Promise<ActiveFloatSummary[]> {
  const now = Date.now();
  if (floatsCache && now - floatsCache.timestamp < 300_000) {
    return floatsCache.data;
  }

  const res = await apiClient<any>(ENDPOINTS.FLOATS, {
    params: { limit },
  });
  let list: ActiveFloatSummary[] = [];
  if (Array.isArray(res)) list = res;
  else if (res && Array.isArray(res.floats)) list = res.floats;

  floatsCache = { data: list, timestamp: now };
  return list;
}

export async function getFloatTrajectory(
  platformNumber: number | string,
  days = 365
): Promise<FloatTrajectoryResponse> {
  const cacheKey = `${platformNumber}_${days}`;
  if (trajectoryCache.has(cacheKey)) {
    return trajectoryCache.get(cacheKey)!;
  }

  const res = await apiClient<any>(
    ENDPOINTS.TRAJECTORY(platformNumber),
    { params: { days } }
  );
  let result: FloatTrajectoryResponse;
  if (res && Array.isArray(res.points)) result = res;
  else if (Array.isArray(res)) result = { platform_number: Number(platformNumber), points: res };
  else result = { platform_number: Number(platformNumber), points: [] };

  trajectoryCache.set(cacheKey, result);
  return result;
}

export async function getDepthProfile(
  platformNumber: number | string,
  cycle?: number
): Promise<DepthProfileResponse> {
  try {
    const res = await apiClient<any>(ENDPOINTS.PROFILE(platformNumber), {
      params: cycle != null ? { cycle } : {},
      timeout: 8000,
    });

    // Normalize: backend returns `pres`, `depth_m`, `depth` — ensure `depth` is always present
    const normalizeMeasurements = (measurements: any[]): any[] => {
      if (!Array.isArray(measurements)) return [];
      return measurements.map((m: any) => ({
        ...m,
        depth: m.depth ?? m.depth_m ?? m.pres ?? 0,
      }));
    };

    const normalizeMeasurement = (m: any): any => {
      if (!m) return null;
      return {
        ...m,
        depth: m.depth ?? m.depth_m ?? m.pres ?? 0,
      };
    };

    let result: DepthProfileResponse;
    if (res && Array.isArray(res.measurements)) {
      result = {
        ...res,
        measurements: normalizeMeasurements(res.measurements),
        deepest_record: normalizeMeasurement(res.deepest_record),
        latest_surface: normalizeMeasurement(res.latest_surface),
      };
    } else if (Array.isArray(res)) {
      result = { platform_number: Number(platformNumber), measurements: normalizeMeasurements(res) };
    } else {
      result = { platform_number: Number(platformNumber), measurements: [] };
    }

    return result;
  } catch {
    // Do NOT cache errors — let the user retry
    return { platform_number: Number(platformNumber), measurements: [] };
  }
}

export async function getBasinStats(
  region = "arabian_sea",
  variable = "temp",
  days = 30
): Promise<RegionalStatsResponse> {
  const cacheKey = `${region}_${variable}_${days}`;
  if (statsCache.has(cacheKey)) {
    return statsCache.get(cacheKey)!;
  }

  const res = await apiClient<RegionalStatsResponse>(ENDPOINTS.STATS, {
    params: { region, variable, days },
  });
  statsCache.set(cacheKey, res);
  return res;
}
