import { notFound, redirect } from "next/navigation";

import type { PermissionType } from "@/types/permission";

import { getDevOnlyRequestHeaders } from "@/lib/api/config";
import { isJsonParseFailurePayload, readJsonPayload } from "@/lib/api/auth-api";

import { getServerApiBaseUrl } from "@/lib/server/api-origin";
import type { ServerSession } from "@/lib/server/auth";
import { WILDFIRE_SERVER_REVALIDATE_SECONDS } from "@/lib/wildfire-server-revalidate-seconds";

export { WILDFIRE_SERVER_REVALIDATE_SECONDS };

/**
 * Next.js Data Cache tags (`wildfire:${tag}`). Use narrow tags so mutations
 * do not invalidate unrelated RSC payloads.
 */
export type ServerCacheTag =
  | "ai"
  | "audit"
  | "content-list"
  | "content-options"
  | "displays-bootstrap"
  | "displays-options"
  | "permissions-options"
  | "playlists"
  | "role-edit-bootstrap"
  | "roles-list"
  | "roles-options"
  | "schedules-bootstrap"
  | "users-list"
  | "users-options";

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

export interface ServerFetchFailure {
  readonly ok: false;
  readonly status: number;
}

export interface ServerFetchSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export type ServerFetchResult<T> = ServerFetchSuccess<T> | ServerFetchFailure;

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
): Promise<ServerFetchResult<T>> {
  const baseUrl = await getServerApiBaseUrl();
  // The Next.js Data Cache keys responses by URL only — the Authorization
  // header is NOT part of the cache key. Without per-user URL variance the
  // first user's response would be served to the next user in the same TTL
  // window. We append the authenticated user id so each user gets their own
  // cache entry. Backend zod query schemas strip unknown keys, so this is
  // ignored server-side.
  const url = buildUrl(baseUrl, input.path, {
    ...input.searchParams,
    _uid: input.session.user.id,
  });

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
            revalidate:
              typeof revalidate === "number"
                ? revalidate
                : WILDFIRE_SERVER_REVALIDATE_SECONDS,
          },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const payload: unknown = await readJsonPayload(response);
  if (isJsonParseFailurePayload(payload)) {
    return { ok: false, status: response.status };
  }

  return { ok: true, data: payload as T };
}

export function handleBootstrapResult<T>(
  result: ServerFetchResult<T>,
  redirectTarget: string,
): asserts result is ServerFetchSuccess<T> {
  if (result.ok) {
    return;
  }

  if (result.status === 401) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTarget)}`);
  }

  if (result.status === 403) {
    redirect("/unauthorized");
  }

  if (result.status === 404) {
    notFound();
  }

  throw new Error(
    `Server bootstrap failed for ${redirectTarget} with status ${result.status}.`,
  );
}

export function sessionHasPermission(
  session: ServerSession,
  permission: PermissionType,
): boolean {
  if (session.user.isAdmin) return true;
  return session.permissions.includes(permission);
}
