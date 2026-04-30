import { cache } from "react";
import { cookies } from "next/headers";

import { parseApiResponseData } from "@/lib/api/contracts";
import { getDevOnlyRequestHeaders } from "@/lib/api/config";
import type { AuthResponse } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

import { getServerApiBaseUrl } from "@/lib/server/api-origin";

const DEFAULT_SESSION_COOKIE = "wildfire_session_token";

function getSessionCookieName(): string {
  return (
    process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE
  );
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
 * Uses POST /auth/refresh with forwarded cookies. Pair with {@link serverFetchJson}.
 *
 * Note: Backend may rotate the refresh token cookie; the browser keeps its cookie
 * until the next client refresh, but a grace window allows overlap.
 */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  if (!(await hasRefreshCookie())) {
    return null;
  }

  const cookieHeader = await buildIncomingCookieHeader();

  const baseUrl = await getServerApiBaseUrl();
  const devHeaders = getDevOnlyRequestHeaders();

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        ...devHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
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
  }
});
