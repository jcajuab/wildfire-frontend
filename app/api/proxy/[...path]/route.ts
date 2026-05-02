import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Catch-all proxy that forwards requests to the backend API.
 *
 * Unlike Next.js rewrites this is a proper route handler, giving us full
 * control over response headers.  In particular it rewrites the `Path`
 * attribute on any `Set-Cookie` headers so that cookies set by the
 * backend (e.g. refresh tokens) are stored for the proxy path prefix
 * and are therefore sent on subsequent requests through the proxy.
 */
async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  if (!API_URL) {
    return NextResponse.json(
      { error: "API_URL is not configured" },
      { status: 502 },
    );
  }

  const path = request.nextUrl.pathname.replace(/^\/api\/proxy\//, "");
  const search = request.nextUrl.search;
  const targetUrl = `${API_URL}/${path}${search}`;

  const headers = new Headers(request.headers);
  // Remove Next.js / host headers that shouldn't be forwarded.
  headers.delete("host");
  headers.delete("connection");

  const init: RequestInit = {
    method: request.method,
    headers,
    // @ts-expect-error -- duplex is required for streaming request bodies
    duplex: "half",
  };

  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.body != null
  ) {
    init.body = request.body;
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstream.headers);

  // Rewrite Set-Cookie Path so cookies survive the /api/proxy prefix.
  const rawSetCookies = upstream.headers.getSetCookie?.() ?? [];
  if (rawSetCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const cookie of rawSetCookies) {
      const rewritten = cookie.replace(/Path=\/[^;]*/gi, "Path=/");
      responseHeaders.append("set-cookie", rewritten);
    }
  }

  // Remove hop-by-hop headers.
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;

// Allow long-running SSE streams (displays/events) without timing out.
export const maxDuration = 300;
