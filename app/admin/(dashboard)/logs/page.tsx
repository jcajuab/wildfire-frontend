import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendAuditEvent } from "@/lib/api/audit-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { auditListQueryFromSearchParams } from "@/lib/audit-log-search-params";
import { getServerSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { AuditListCacheSeeder, LogsPageClient } from "./logs-page-client";

interface LogsPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function LogsPage({
  searchParams,
}: LogsPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/logs")}`);
  }
  if (!sessionHasPermission(session, "audit:read")) {
    redirect("/unauthorized");
  }

  const sp = (await searchParams) ?? {};
  const listQuery = auditListQueryFromSearchParams(sp);

  const eventsRes = await serverFetchJson<unknown>({
    session,
    path: "audit/events",
    searchParams: {
      page: listQuery.page ?? 1,
      pageSize: listQuery.pageSize ?? 20,
      from: listQuery.from,
      to: listQuery.to,
      action: listQuery.action,
      actorType: listQuery.actorType,
      resourceType: listQuery.resourceType,
      status: listQuery.status,
      requestId: listQuery.requestId,
    },
    tags: ["audit"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(eventsRes, "/admin/logs");

  const eventsData = transformPaginatedListResponse<BackendAuditEvent>(
    eventsRes.data,
    "listAuditEvents",
  );

  return (
    <>
      <AuditListCacheSeeder queryArgs={listQuery} data={eventsData} />
      <LogsPageClient />
    </>
  );
}
