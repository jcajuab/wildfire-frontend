import {
  type BaseQueryFn,
  fetchBaseQuery,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import {
  AUTH_API_ERROR_EVENT,
  type AuthApiErrorEventDetail,
} from "@/lib/auth-events";

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
const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: "include",
  prepareHeaders(headers) {
    Object.entries(getDevOnlyRequestHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return headers;
  },
});

/**
 * Shared baseQuery wrapper that emits global auth events for 401/429.
 * AuthContext listens to this event for deterministic auth/session behavior.
 */
export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const status = result.error?.status;
  if (typeof window !== "undefined" && (status === 401 || status === 429)) {
    const detail: AuthApiErrorEventDetail = {
      status,
      url:
        typeof args === "string"
          ? args
          : typeof args.url === "string"
            ? args.url
            : "",
      method:
        typeof args === "string"
          ? "GET"
          : typeof args.method === "string"
            ? args.method
            : "GET",
    };
    window.dispatchEvent(new CustomEvent(AUTH_API_ERROR_EVENT, { detail }));
  }
  return result;
};
