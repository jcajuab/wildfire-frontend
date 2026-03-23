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

export function proxy(request: NextRequest): NextResponse {
  const sessionCookie = request.cookies.get("wildfire_session_token");
  if (!sessionCookie || isJwtExpired(sessionCookie.value)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
