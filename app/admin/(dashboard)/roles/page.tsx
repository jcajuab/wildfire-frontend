import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { RbacRoleListItem, RbacRoleListQuery } from "@/lib/api/rbac-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  ROLES_PAGE_SIZE,
  rolesListQueryFromSearchParams,
} from "@/lib/roles-search-params";
import { cacheLife, cacheTag } from "next/cache";

import {
  getCachedServerSession,
  getServerSession,
  resolveSession,
} from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { RolesListCacheSeeder, RolesPageView } from "./roles-page-client";

interface RolesPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

async function getCachedRolesList(params: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  q?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:roles-list");
  cacheLife("dashboard");

  const sessionResult = await getServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "roles",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  return transformPaginatedListResponse<RbacRoleListItem>(
    res.data,
    "getRoles",
  );
}

export default async function RolesPage({
  searchParams,
}: RolesPageProps): Promise<ReactElement> {
  const session = resolveSession(await getCachedServerSession(), "/admin/roles");
  if (!session) {
    return <RolesPageView />;
  }
  if (!sessionHasPermission(session, "roles:read")) {
    redirect("/unauthorized");
  }

  const sp = (await searchParams) ?? {};
  const q = rolesListQueryFromSearchParams(sp, ROLES_PAGE_SIZE);

  const queryArgs: RbacRoleListQuery = {
    page: q.page,
    pageSize: q.pageSize,
    q: q.q,
    sortBy: q.sortBy,
    sortDirection: q.sortDirection,
  };

  const rolesData = await getCachedRolesList({
    page: queryArgs.page ?? 1,
    pageSize: queryArgs.pageSize ?? ROLES_PAGE_SIZE,
    sortBy: queryArgs.sortBy ?? "name",
    sortDirection: queryArgs.sortDirection ?? "asc",
    q: queryArgs.q,
  });

  return (
    <>
      {rolesData ? <RolesListCacheSeeder queryArgs={queryArgs} data={rolesData} /> : null}
      <RolesPageView />
    </>
  );
}
