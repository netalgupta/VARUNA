/**
 * VARUNA API Client — Resilient Fetch & Error Wrapper
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClientError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
}

export async function apiClient<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, timeout = 180000, headers, ...restOptions } = options;

  let url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      throw new ApiClientError(
        `API Request Failed (${res.status}): ${res.statusText}`,
        res.status,
        errorData
      );
    }

    // If binary / attachment
    const contentType = res.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      return (await res.blob()) as unknown as T;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiClientError("Request timed out", 408);
    }
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(err.message || "Network Error", 0, err);
  }
}
