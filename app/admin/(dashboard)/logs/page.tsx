import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendAuditEvent } from "@/lib/api/audit-api";
import type { DisplayOption } from "@/lib/api/displays-api";
import type { RbacUser } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { auditListQueryFromSearchParams } from "@/lib/audit-log-search-params";
import { cacheLife, cacheTag } from "next/cache";

import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import {
  AuditListCacheSeeder,
  DisplayOptionsCacheSeeder,
  LogsPageClient,
  UserOptionsCacheSeeder,
} from "./logs-page-client";

interface LogsPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

async function getCachedAuditEvents(params: {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: string;
  actorType?: string;
  resourceType?: string;
  status?: number;
  requestId?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:audit");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "audit/events",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  return transformPaginatedListResponse<BackendAuditEvent>(
    res.data,
    "listAuditEvents",
  );
}

async function getCachedUserOptions() {
  "use cache: private";
  cacheTag("wildfire:users-options");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "users/options",
    searchParams: { limit: 100 },
    revalidate: false,
  });

  if (!res.ok) return null;
  return parseApiResponseDataSafe<RbacUser[]>(res.data, "getUserOptions");
}

async function getCachedDisplayOptions() {
  "use cache: private";
  cacheTag("wildfire:displays-options");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "displays/options",
    searchParams: { limit: 100 },
    revalidate: false,
  });

  if (!res.ok) return null;
  return parseApiResponseDataSafe<DisplayOption[]>(
    res.data,
    "getDisplayOptions",
  );
}

export default async function LogsPage({
  searchParams,
}: LogsPageProps): Promise<ReactElement> {
  const sp = (await searchParams) ?? {};
  const listQuery = auditListQueryFromSearchParams(sp);

  const session = resolveSession(await getCachedServerSession(), "/admin/logs");
  if (!session) {
    return <LogsPageClient />;
  }
  if (!sessionHasPermission(session, "audit:read")) {
    redirect("/unauthorized");
  }

  const canReadUsers = sessionHasPermission(session, "users:read");
  const canReadDisplays = sessionHasPermission(session, "displays:read");

  const [eventsData, userOptions, displayOptions] = await Promise.all([
    getCachedAuditEvents({
      page: listQuery.page ?? 1,
      pageSize: listQuery.pageSize ?? 20,
      from: listQuery.from,
      to: listQuery.to,
      action: listQuery.action,
      actorType: listQuery.actorType,
      resourceType: listQuery.resourceType,
      status: listQuery.status,
      requestId: listQuery.requestId,
    }),
    canReadUsers ? getCachedUserOptions() : null,
    canReadDisplays ? getCachedDisplayOptions() : null,
  ]);

  return (
    <>
      {eventsData ? <AuditListCacheSeeder queryArgs={listQuery} data={eventsData} /> : null}
      {userOptions ? <UserOptionsCacheSeeder data={userOptions} /> : null}
      {displayOptions ? <DisplayOptionsCacheSeeder data={displayOptions} /> : null}
      <LogsPageClient />
    </>
  );
}
