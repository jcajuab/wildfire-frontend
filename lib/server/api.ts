import type { PermissionType } from "@/types/permission";

import { getDevOnlyRequestHeaders } from "@/lib/api/config";

import { getServerApiBaseUrl } from "@/lib/server/api-origin";
import type { ServerSession } from "@/lib/server/auth";

export type ServerCacheTag =
  | "ai"
  | "audit"
  | "content"
  | "displays"
  | "playlists"
  | "schedules"
  | "users"
  | "roles"
  | "permissions";

export type ServerSearchParamValue =
  | string
  | number
  | undefined
  | readonly string[];

export interface ServerFetchInit {
  readonly session: ServerSession;
  readonly path: string;
  /** Relative to API version root, e.g. `audit/events?page=1` */
  readonly searchParams?: Record<string, ServerSearchParamValue>;
  readonly tags?: readonly ServerCacheTag[];
  readonly revalidate?: number | false;
  readonly headers?: HeadersInit;
  readonly method?: string;
  readonly body?: BodyInit;
}

function buildUrl(
  baseUrl: string,
  path: string,
  searchParams?: Record<string, ServerSearchParamValue>,
): string {
  const trimmedPath = path.replace(/^\//, "");
  const url = new URL(trimmedPath, `${baseUrl}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === "") continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        for (const entry of value) {
          if (entry === "") continue;
          url.searchParams.append(key, String(entry));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function serverFetchJson<T>(
  input: ServerFetchInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const baseUrl = await getServerApiBaseUrl();
  const url = buildUrl(baseUrl, input.path, input.searchParams);

  const devHeaders = getDevOnlyRequestHeaders();
  const nextTags = input.tags?.map((t) => `wildfire:${t}`) ?? [];

  const { session, revalidate, headers: extraHeaders, method, body } = input;

  const response = await fetch(url, {
    method: method ?? "GET",
    body,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/json",
      ...devHeaders,
      ...(extraHeaders as Record<string, string> | undefined),
    },
    cache: revalidate === false ? "no-store" : undefined,
    next:
      revalidate === false
        ? undefined
        : {
            tags: nextTags,
            revalidate: typeof revalidate === "number" ? revalidate : 60,
          },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const json: unknown = await response.json();
  const data = json as T;
  return { ok: true, data };
}

export function sessionHasPermission(
  session: ServerSession,
  permission: PermissionType,
): boolean {
  if (session.user.isAdmin) return true;
  return session.permissions.includes(permission);
}
