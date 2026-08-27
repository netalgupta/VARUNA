/**
 * Columnar Analytics & Dataset Export API Client
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ExportFormat = "csv" | "parquet" | "json";

export function getExportDownloadUrl(
  sql: string,
  format: ExportFormat = "csv"
): string {
  const searchParams = new URLSearchParams({
    sql,
    format,
  });
  return `${API_BASE_URL}${ENDPOINTS.EXPORT}?${searchParams.toString()}`;
}

export async function exportDataset(
  sql: string,
  format: ExportFormat = "csv"
): Promise<Blob> {
  return apiClient<Blob>(ENDPOINTS.EXPORT, {
    params: { sql, format },
  });
}
