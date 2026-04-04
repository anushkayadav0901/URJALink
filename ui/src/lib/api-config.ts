// Shared API configuration for Kubb-generated hooks and clients.
// Wraps the default Kubb fetch client to add baseURL, JSON headers, and error handling.

import { client as kubbFetchClient } from "@kubb/plugin-client/clients/fetch";
import type { RequestConfig, ResponseConfig } from "@kubb/plugin-client/clients/fetch";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Custom fetch client that:
 * 1. Prepends the API base URL
 * 2. Sets Content-Type: application/json for non-FormData requests
 * 3. Throws on non-2xx responses (like the manual fetch calls did)
 */
async function apiClient<TResponseData, TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
): Promise<ResponseConfig<TResponseData>> {
  const isFormData = config.data instanceof FormData;

  const response = await kubbFetchClient<TResponseData, TError, TRequestData>({
    ...config,
    baseURL: config.baseURL ?? API_BASE,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(Array.isArray(config.headers) ? Object.fromEntries(config.headers) : config.headers),
    },
  });

  // Throw on non-2xx to match React Query's error handling expectations
  if (response.status < 200 || response.status >= 300) {
    const errorMessage =
      typeof response.data === "object" && response.data !== null && "detail" in response.data
        ? String((response.data as Record<string, unknown>).detail)
        : `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return response;
}

/** Shared request config for all Kubb-generated hooks — uses our custom client */
export const apiClientConfig = { client: apiClient };
