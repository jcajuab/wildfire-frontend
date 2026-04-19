/**
 * Backend API base URL with versioned API path suffix (e.g. /v1).
 *
 * In development with a cross-origin API URL, requests are routed through
 * Next.js rewrites (`/api/proxy/*`) to avoid CORS preflight overhead.
 * In production (same-origin), the versioned path is returned directly.
 */
export function getBaseUrl(): string {
  const rawVersion = process.env.NEXT_PUBLIC_API_VERSION;
  const apiVersion =
    typeof rawVersion === "string" && rawVersion.trim() !== ""
      ? rawVersion.trim().replace(/^\//, "")
      : "v1";

  const rawUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof rawUrl !== "string" || rawUrl === "") {
    return `/${apiVersion}`;
  }

  if (shouldUseDevProxy(rawUrl)) {
    return `/api/proxy/${apiVersion}`;
  }

  const trimmedUrl = rawUrl.replace(/\/$/, "");
  return `${trimmedUrl}/${apiVersion}`;
}

function shouldUseDevProxy(apiUrl: string): boolean {
  if (typeof window === "undefined") return false;
  // Test environments (jsdom/happy-dom) have window but no Next.js rewrite layer.
  if (process.env.NODE_ENV === "test") return false;
  try {
    const target = new URL(apiUrl);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isNgrokApiUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return typeof url === "string" && url.includes("ngrok");
}

export function getDevOnlyRequestHeaders(): Record<string, string> {
  if (!isNgrokApiUrl()) return {};
  return { "ngrok-skip-browser-warning": "true" };
}
