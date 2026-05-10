import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";

import { parseApiResponseData } from "@/lib/api/contracts";
import { getDevOnlyRequestHeaders } from "@/lib/api/config";
import type { AuthResponse } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

import { getServerApiBaseUrl } from "@/lib/server/api-origin";

const DEFAULT_SESSION_COOKIE = "wildfire_session_token";

/** Milliseconds before server-side refresh fetch is aborted (avoids hanging on proxy/network issues). */
const SERVER_SESSION_REFRESH_TIMEOUT_MS = 5_000;

/** Cookie name for the HttpOnly refresh token (matches backend `AUTH_SESSION_COOKIE_NAME`). */
export function getAuthSessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE;
}

async function buildIncomingCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
}

async function hasRefreshCookie(): Promise<boolean> {
  const store = await cookies();
  return store.has(getAuthSessionCookieName());
}

export interface ServerSession {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly user: AuthResponse["user"];
  readonly permissions: PermissionType[];
}

export type ServerSessionResult =
  | { status: "ok"; session: ServerSession }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

/**
 * Exchange refresh cookie for access token on the server (per-request memoized).
 * Uses POST /auth/refresh with forwarded cookies and `X-Server-Refresh: true` so
 * the backend does not rotate the refresh token (server-side fetch cannot apply
 * Set-Cookie to the browser). Pair with {@link serverFetchJson}.
 *
 * Returns a discriminated union: "ok" (valid session), "unauthenticated" (confirmed
 * 401 or no refresh cookie), or "unavailable" (timeout, network error, or backend
 * 5xx) so callers can distinguish a real logout from a transient failure.
 */
export const getServerSession = cache(
  async (): Promise<ServerSessionResult> => {
    if (!(await hasRefreshCookie())) {
      return { status: "unauthenticated" };
    }

    const cookieHeader = await buildIncomingCookieHeader();

    const baseUrl = await getServerApiBaseUrl();
    const devHeaders = getDevOnlyRequestHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SERVER_SESSION_REFRESH_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "X-Server-Refresh": "true",
          ...devHeaders,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.status === 401) {
        return { status: "unauthenticated" };
      }

      if (!response.ok) {
        return { status: "unavailable" };
      }

      const payload: unknown = await response.json();
      const data = parseApiResponseData<AuthResponse>(payload);

      return {
        status: "ok",
        session: {
          accessToken: data.accessToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
          user: data.user,
          permissions: data.permissions,
        },
      };
    } catch {
      return { status: "unavailable" };
    } finally {
      clearTimeout(timeoutId);
    }
  },
);

/**
 * Resolves a `ServerSessionResult` for a protected page.
 *
 * - "ok" → returns the session
 * - "unauthenticated" → redirects to /login (throws, never returns)
 * - "unavailable" → returns null so the page can render a skeleton and let
 *   the client-side AuthGuard handle authentication at hydration time
 */
export function resolveSession(
  result: ServerSessionResult,
  redirectTarget: string,
): ServerSession | null {
  if (result.status === "ok") return result.session;
  if (result.status === "unauthenticated") {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTarget)}`);
  }
  return null;
}

/**
 * Cached variant of {@link getServerSession} for page-level auth checks.
 *
 * Keyed per-user (cookies are part of the `"use cache: private"` key) and
 * served stale for up to 60 s so repeat navigations skip the backend
 * `/auth/refresh` round-trip entirely.  The underlying data-fetching
 * `getCachedXxx` functions still call `getServerSession()` directly on cache
 * miss, so they always use a fresh token when they actually talk to the API.
 */
export async function getCachedServerSession(): Promise<ServerSessionResult> {
  "use cache: private";
  cacheTag("wildfire:session");
  cacheLife("dashboard");

  return getServerSession();
}
