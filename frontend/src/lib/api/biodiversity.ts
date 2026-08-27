/**
 * CMLRE Biodiversity & Cross-Domain Spatial Join API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  BiodiversityRecord,
  SpatialCorrelationRecord,
} from "@/types/biodiversity";

export async function getBiodiversity(params?: {
  species?: string;
  family?: string;
  limit?: number;
}): Promise<BiodiversityRecord[]> {
  return apiClient<BiodiversityRecord[]>(ENDPOINTS.BIODIVERSITY, { params });
}

export async function correlateSpecies(params?: {
  species?: string;
  days_window?: number;
  max_distance_km?: number;
}): Promise<SpatialCorrelationRecord[]> {
  return apiClient<SpatialCorrelationRecord[]>(ENDPOINTS.CORRELATE, {
    params,
  });
}

export async function getSpeciesCorrelations(
  species = "Sardinella longiceps",
  days_window = 90,
  max_distance_km = 50
): Promise<SpatialCorrelationRecord[]> {
  return correlateSpecies({ species, days_window, max_distance_km });
}
