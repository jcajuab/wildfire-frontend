/**
 * Backend API base URL with versioned API path suffix (e.g. /api/v1).
 */
export function getBaseUrl(): string {
  const rawVersion = process.env.NEXT_PUBLIC_API_VERSION;
  const apiVersion =
    typeof rawVersion === "string" && rawVersion.trim() !== ""
      ? rawVersion.trim().replace(/^\//, "")
      : "v1";

  const rawUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "/api";
  const trimmedUrl = rawUrl.replace(/\/$/, "");
  return `${trimmedUrl}/${apiVersion}`;
}

function isNgrokApiUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return typeof url === "string" && url.includes("ngrok");
}

export function getDevOnlyRequestHeaders(): Record<string, string> {
  if (!isNgrokApiUrl()) return {};
  return { "ngrok-skip-browser-warning": "true" };
}
