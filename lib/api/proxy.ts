import { getBackendUrl } from "./backend-url";

const isDev = process.env.NODE_ENV === "development";

interface ProxyOptions {
  method: string;
  path: string;
  authorization: string | null;
  body?: string;
  streamResponse?: boolean;
  extraHeaders?: Record<string, string>;
}

/**
 * Proxies a request to the backend API with error handling.
 * Forwards the bearer token from the incoming request when present.
 * In development, detailed errors are returned in the response.
 * In production, errors are generic.
 */
export async function proxyToBackend({
  method,
  path,
  authorization,
  body,
  streamResponse,
  extraHeaders,
}: ProxyOptions): Promise<Response> {
  const url = `${getBackendUrl()}${path}`;

  try {
    const headers: Record<string, string> = {
      ...extraHeaders,
    };
    if (authorization) {
      headers.Authorization = authorization;
    }
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { method, headers, body });

    if (streamResponse && response.ok) {
      const streamHeaders = new Headers(response.headers);
      streamHeaders.set("Cache-Control", "no-cache");
      streamHeaders.set("Connection", "keep-alive");
      streamHeaders.delete("transfer-encoding");
      return new Response(response.body, {
        status: response.status,
        headers: streamHeaders,
      });
    }

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
