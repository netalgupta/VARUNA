/**
 * Proactive Marine Anomalies & Predictive ML API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  AnomalyAlert,
  MHWForecastRequest,
  MHWForecastResponse,
  ProfileQCRequest,
  ProfileQCResponse,
} from "@/types/anomalies";

export async function getAnomalies(params?: {
  basin?: string;
  severity?: string;
  limit?: number;
}): Promise<AnomalyAlert[]> {
  return apiClient<AnomalyAlert[]>(ENDPOINTS.ANOMALIES, { params });
}

export async function getAnomalyDetail(
  id: number | string
): Promise<AnomalyAlert> {
  return apiClient<AnomalyAlert>(ENDPOINTS.ANOMALY_DETAIL(id));
}

export async function forecastMHW(
  req: MHWForecastRequest
): Promise<MHWForecastResponse> {
  return apiClient<MHWForecastResponse>(ENDPOINTS.ML_FORECAST_MHW, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function detectSensorQC(
  req: ProfileQCRequest
): Promise<ProfileQCResponse> {
  return apiClient<ProfileQCResponse>(ENDPOINTS.ML_QC_DETECT, {
    method: "POST",
    body: JSON.stringify(req),
  });
}
