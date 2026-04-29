import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCspHeader(): string {
  const apiOrigin = getAbsoluteOrigin(process.env.NEXT_PUBLIC_API_URL);
  const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${storageUrl ? ` ${storageUrl}` : ""}`,
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}${storageUrl ? ` ${storageUrl}` : ""}`,
    `media-src 'self' blob:${storageUrl ? ` ${storageUrl}` : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function getAbsoluteOrigin(url: string | undefined): string {
  if (!url) return "";

  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * Session cookie set by the backend on login/refresh (HTTP-only, path=/).
 * Presence is a heuristic — it does not guarantee a valid session, but it
 * eliminates the visible "skeleton → auth check → redirect" flash for:
 *   1. Unauthenticated user visits /admin/* → instant redirect to /login
 *   2. Authenticated user visits /login   → instant redirect to /admin
 * The client-side AuthGuard remains the authoritative check.
 */
const SESSION_COOKIE = "wildfire_session_token";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Unauthenticated user trying to access admin → redirect to login.
  // This eliminates the "skeleton → auth check → redirect" flash.
  // NOTE: we intentionally do NOT redirect /login → /admin when a cookie
  // exists, because the cookie may be stale/expired and the client-side
  // AuthGuard would redirect back to /login, creating a loop.
  if (!hasSession && pathname.startsWith("/admin")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const csp = buildCspHeader();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
