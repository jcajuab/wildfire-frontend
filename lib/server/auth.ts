import { cache } from "react";
import { cookies } from "next/headers";

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
  return (
    process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE
  );
}

function getSessionCookieName(): string {
  return getAuthSessionCookieName();
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
  return store.has(getSessionCookieName());
}

export interface ServerSession {
  readonly accessToken: string;
  readonly user: AuthResponse["user"];
  readonly permissions: PermissionType[];
}

/**
 * Exchange refresh cookie for access token on the server (per-request memoized).
 * Uses POST /auth/refresh with forwarded cookies and `X-Server-Refresh: true` so
 * the backend does not rotate the refresh token (server-side fetch cannot apply
 * Set-Cookie to the browser). Pair with {@link serverFetchJson}.
 */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  if (!(await hasRefreshCookie())) {
    return null;
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

    if (!response.ok) {
      if (response.status === 401) {
        const store = await cookies();
        store.delete({
          name: getSessionCookieName(),
          path: "/",
        });
      }
      return null;
    }

    const payload: unknown = await response.json();
    const data = parseApiResponseData<AuthResponse>(payload);

    return {
      accessToken: data.accessToken,
      user: data.user,
      permissions: data.permissions,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
});
