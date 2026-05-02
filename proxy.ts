import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

/** Aligned with backend and {@link lib/server/auth.ts}. */
const DEFAULT_SESSION_COOKIE = "wildfire_session_token";

function sessionCookieName(): string {
  return (
    process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(sessionCookieName());
}

/** Allow only same-app paths (no open redirects). */
function safeInternalPath(raw: string | null): string | null {
  if (raw == null || raw === "") {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

function applyCsp(request: NextRequest): NextResponse {
  const csp = buildCspHeader();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

/**
 * Edge proxy: CSP on every matched route plus fast auth redirects.
 * Cookie presence is a heuristic (invalid cookies fall through to client AuthGuard).
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = hasSessionCookie(request);

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (hasSession) {
      const redirectTo = safeInternalPath(
        request.nextUrl.searchParams.get("redirectTo"),
      );
      const target = redirectTo ?? "/admin";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return applyCsp(request);
  }

  const isRoot = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  if ((isRoot || isAdmin) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    if (isAdmin) {
      loginUrl.searchParams.set(
        "redirectTo",
        `${pathname}${search === "" ? "" : search}`,
      );
    }
    return NextResponse.redirect(loginUrl);
  }

  return applyCsp(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
