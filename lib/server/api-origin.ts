import { headers } from "next/headers";

/**
 * Absolute API base URL including version segment (e.g. .../v1) for server-side fetch.
 *
 * Prefer `BACKEND_URL` in production (direct to internal API, avoids proxy hop).
 * Falls back to absolute `NEXT_PUBLIC_API_URL`, then reconstructs from request Host
 * when `NEXT_PUBLIC_API_URL` is relative (e.g. `/api`).
 */
export async function getServerApiBaseUrl(): Promise<string> {
  const version =
    process.env.NEXT_PUBLIC_API_VERSION?.trim().replace(/^\//, "") || "v1";

  const backend = process.env.BACKEND_URL?.trim();
  if (backend?.startsWith("http")) {
    const trimmed = backend.replace(/\/$/, "");
    return trimmed.endsWith(`/${version}`) ? trimmed : `${trimmed}/${version}`;
  }

  const pub = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "/api";
  if (pub.startsWith("http")) {
    const trimmed = pub.replace(/\/$/, "");
    return `${trimmed}/${version}`;
  }

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  if (host.length === 0) {
    throw new Error(
      "Cannot resolve API URL: set BACKEND_URL or use an absolute NEXT_PUBLIC_API_URL",
    );
  }

  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto =
    forwardedProto?.split(",")[0]?.trim() ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  const pathPrefix = pub.startsWith("/") ? pub : `/${pub}`;
  return `${proto}://${host}${pathPrefix}/${version}`;
}
