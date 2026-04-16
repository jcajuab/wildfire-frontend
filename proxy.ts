import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCspHeader(): string {
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : "";
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

export function proxy(request: NextRequest): NextResponse {
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
