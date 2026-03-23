import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// UX-only redirect guard. The backend validates JWT signatures on every API request.
// We only check expiry here to avoid showing the admin shell to users with stale tokens.
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    if (typeof decoded.exp !== "number") return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

const isDev = process.env.NODE_ENV === "development";

function buildCspHeader(nonce: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline' 'nonce-${nonce}'`,
    `img-src 'self' data: blob: https:${storageUrl ? ` ${storageUrl}` : ""}`,
    "font-src 'self' data:",
    `connect-src 'self'${apiUrl ? ` ${apiUrl}` : ""}${storageUrl ? ` ${storageUrl}` : ""} wss:`,
    `media-src 'self' blob:${storageUrl ? ` ${storageUrl}` : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminPath) {
    const sessionCookie = request.cookies.get("wildfire_session_token");
    if (!sessionCookie || isJwtExpired(sessionCookie.value)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
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
