import { getBackendUrl } from "./backend-url";

const isDev = process.env.NODE_ENV === "development";

interface ProxyOptions {
  method: string;
  path: string;
  cookies: string | null;
  csrfToken: string | null;
  body?: string;
  streamResponse?: boolean;
  extraHeaders?: Record<string, string>;
}

/**
 * Proxies a request to the backend API with error handling.
 * Forwards the session cookie and CSRF token from the incoming request.
 * In development, detailed errors are returned in the response.
 * In production, errors are generic.
 */
export async function proxyToBackend({
  method,
  path,
  cookies,
  csrfToken,
  body,
  streamResponse,
  extraHeaders,
}: ProxyOptions): Promise<Response> {
  const url = `${getBackendUrl()}${path}`;

  try {
    const headers: Record<string, string> = {
      ...extraHeaders,
    };
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { method, headers, body });

    if (streamResponse && response.ok) {
      // Forward all backend headers so AI SDK protocol headers
      // (e.g. x-vercel-ai-ui-message-stream) reach the client transport.
      const streamHeaders = new Headers(response.headers);
      streamHeaders.set("Cache-Control", "no-cache");
      streamHeaders.set("Connection", "keep-alive");
      // Remove hop-by-hop headers that must not be forwarded
      streamHeaders.delete("transfer-encoding");
      return new Response(response.body, {
        status: response.status,
        headers: streamHeaders,
      });
    }

    // When streamResponse is true but response is not ok (e.g. 429 Too Many
    // Requests), fall through to the error path below so the client receives
    // a well-formed JSON error body that useChat can surface via its error state.
    if (!response.ok && isDev) {
      const text = await response.text();
      console.error(
        `[API Proxy] ${method} ${path} -> ${String(response.status)}`,
        text,
      );
      return new Response(
        JSON.stringify({
          error: `Backend returned ${String(response.status)}`,
          detail: text,
          path,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";

    console.error(`[API Proxy] ${method} ${path} FAILED:`, message);

    const detail = isDev
      ? { error: message, path, hint: "Is the backend running?" }
      : { error: "Service unavailable" };

    return new Response(JSON.stringify(detail), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
