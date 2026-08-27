/**
 * CMLRE Biodiversity & Cross-Domain Spatial Join API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  BiodiversityRecord,
  SpatialCorrelationRecord,
  EcologicalProfile,
} from "@/types/biodiversity";

export interface BiodiversityObservation {
  occurrence_id: string;
  scientific_name: string;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  minimum_depth_m: number | null;
  maximum_depth_m: number | null;
  individual_count: number | null;
  occurrence_status: string;
  basis_of_record: string;
  source_dataset_name: string;
}

export async function getBiodiversity(params?: {
  species?: string;
  family?: string;
  limit?: number;
}): Promise<BiodiversityRecord[]> {
  return apiClient<BiodiversityRecord[]>(ENDPOINTS.BIODIVERSITY, { params, timeout: 180000 });
}

export async function getEcologicalProfiles(params?: {
  species?: string;
  family?: string;
  habitat_zone?: string;
  limit?: number;
}): Promise<EcologicalProfile[]> {
  return apiClient<EcologicalProfile[]>(ENDPOINTS.BIODIVERSITY_PROFILES, { params, timeout: 120000 });
}

export async function getBiodiversityObservations(species: string, limit = 5000): Promise<BiodiversityObservation[]> {
  return apiClient<BiodiversityObservation[]>(ENDPOINTS.BIODIVERSITY_OBSERVATIONS, { params: { species, limit }, timeout: 60000 });
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
