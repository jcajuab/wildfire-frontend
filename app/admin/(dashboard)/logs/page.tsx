import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendAuditEvent } from "@/lib/api/audit-api";
import type { DisplayOption } from "@/lib/api/displays-api";
import type { RbacUser } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { auditListQueryFromSearchParams } from "@/lib/audit-log-search-params";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { LogsPageClient } from "./logs-page-client";

interface LogsPageProps {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LogsPage({
  searchParams,
}: LogsPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?redirectTo=%2Fadmin%2Flogs");
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
    revalidate: 30,
  });

  if (!eventsRes.ok) {
    redirect("/login?redirectTo=%2Fadmin%2Flogs");
  }

  const eventsData = transformPaginatedListResponse<BackendAuditEvent>(
    eventsRes.data,
    "listAuditEvents",
  );

  let users: readonly RbacUser[] = [];
  if (sessionHasPermission(session, "users:read")) {
    const usersRes = await serverFetchJson<unknown>({
      session,
      path: "users/options",
      searchParams: { limit: 100 },
      tags: ["users"],
      revalidate: 30,
    });
    if (usersRes.ok) {
      users = parseApiResponseDataSafe<RbacUser[]>(usersRes.data, "users/options");
    }
  }

  let displays: readonly DisplayOption[] = [];
  if (sessionHasPermission(session, "displays:read")) {
    const displaysRes = await serverFetchJson<unknown>({
      session,
      path: "displays/options",
      searchParams: { limit: 100 },
      tags: ["displays"],
      revalidate: 30,
    });
    if (displaysRes.ok) {
      displays = parseApiResponseDataSafe<DisplayOption[]>(
        displaysRes.data,
        "displays/options",
      );
    }
  }

  return (
    <LogsPageClient
      canExport
      events={eventsData.items}
      total={eventsData.total}
      users={users}
      displays={displays}
    />
  );
}
