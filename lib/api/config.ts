/**
 * Backend API base URL with versioned API path suffix (e.g. /v1).
 * Falls back to same-origin path if NEXT_PUBLIC_API_URL is not set.
 */
export function getBaseUrl(): string {
  const rawVersion = process.env.NEXT_PUBLIC_API_VERSION;
  const apiVersion =
    typeof rawVersion === "string" && rawVersion.trim() !== ""
      ? rawVersion.trim().replace(/^\//, "")
      : "v1";
  const apiPath = `/${apiVersion}`;
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof rawUrl !== "string" || rawUrl === "") {
    return apiPath;
  }
  const trimmedUrl = rawUrl.replace(/\/$/, "");
  return `${trimmedUrl}${apiPath}`;
}

function isNgrokApiUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return typeof url === "string" && url.includes("ngrok");
}

export function getDevOnlyRequestHeaders(): Record<string, string> {
  if (!isNgrokApiUrl()) return {};
  return { "ngrok-skip-browser-warning": "true" };
}
