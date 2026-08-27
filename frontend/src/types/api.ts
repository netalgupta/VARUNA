/**
 * Generic API types for VARUNA Gateway
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  ok?: boolean;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  services: {
    postgres?: string;
    qdrant?: string;
    openrouter?: string;
  };
  uptime_seconds?: number;
}
