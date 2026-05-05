import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { RbacRoleListItem, RbacRoleListQuery } from "@/lib/api/rbac-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  ROLES_PAGE_SIZE,
  rolesListQueryFromSearchParams,
} from "@/lib/roles-search-params";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { RolesListCacheSeeder, RolesPageView } from "./roles-page-client";

interface RolesPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function RolesPage({
  searchParams,
}: RolesPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/roles")}`);
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

  const rolesRes = await serverFetchJson<unknown>({
    session,
    path: "roles",
    searchParams: {
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? ROLES_PAGE_SIZE,
      q: queryArgs.q,
      sortBy: queryArgs.sortBy ?? "name",
      sortDirection: queryArgs.sortDirection ?? "asc",
    },
    tags: ["roles-list"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  if (!rolesRes.ok) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/roles")}`);
  }

  const rolesData = transformPaginatedListResponse<RbacRoleListItem>(
    rolesRes.data,
    "getRoles",
  );

  return (
    <>
      <RolesListCacheSeeder queryArgs={queryArgs} data={rolesData} />
      <RolesPageView />
    </>
  );
}
