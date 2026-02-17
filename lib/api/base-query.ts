import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Backend API base URL (no trailing slash). Empty string if not set.
 */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (typeof url !== "string" || url === "") {
    return "";
  }
  return url.replace(/\/$/, "");
}

/**
 * True when NEXT_PUBLIC_API_URL points at an ngrok tunnel (local dev only).
 */
function isNgrokApiUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return typeof url === "string" && url.includes("ngrok");
}

/**
 * Headers to add only in development when using ngrok (e.g. ngrok-skip-browser-warning).
 * Returns empty object in production so it's safe to spread.
 */
export function getDevOnlyRequestHeaders(): Record<string, string> {
  if (!isNgrokApiUrl()) return {};
  return { "ngrok-skip-browser-warning": "true" };
}

/**
 * Shared base query for all RTK Query APIs. Adds auth token and dev-only ngrok header.
 */
export const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: "include",
  prepareHeaders(headers) {
    Object.entries(getDevOnlyRequestHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return headers;
  },
});
