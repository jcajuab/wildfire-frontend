import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  RbacRoleSummary,
  RbacUser,
  RbacUserListQuery,
} from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  USERS_PAGE_SIZE,
  usersListQueryFromSearchParams,
} from "@/lib/users-search-params";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { AuthGate } from "@/app/admin/auth-gate";
import {
  RoleOptionsCacheSeeder,
  UsersListCacheSeeder,
  UsersPageView,
} from "./users-page-client";

interface UsersPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function UsersPage({
  searchParams,
}: UsersPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    return <AuthGate redirectTo="/admin/users" />;
  }
  if (!sessionHasPermission(session, "users:read")) {
    redirect("/unauthorized");
  }

  const sp = (await searchParams) ?? {};
  const q = usersListQueryFromSearchParams(sp, USERS_PAGE_SIZE);

  const queryArgs: RbacUserListQuery = {
    page: q.page,
    pageSize: q.pageSize,
    q: q.q,
    sortBy: q.sortBy,
    sortDirection: q.sortDirection,
  };

  const usersRes = await serverFetchJson<unknown>({
    session,
    path: "users",
    searchParams: {
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? USERS_PAGE_SIZE,
      q: queryArgs.q,
      sortBy: queryArgs.sortBy ?? "name",
      sortDirection: queryArgs.sortDirection ?? "asc",
    },
    tags: ["users-list"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  if (!usersRes.ok) {
    return <AuthGate redirectTo="/admin/users" />;
  }

  const usersData = transformPaginatedListResponse<RbacUser>(
    usersRes.data,
    "getUsers",
  );

  const canReadRoles = sessionHasPermission(session, "roles:read");

  let roleOptionsSeeder: ReactElement | null = null;
  if (canReadRoles) {
    const rolesRes = await serverFetchJson<unknown>({
      session,
      path: "roles/options",
      searchParams: { limit: 100 },
      tags: ["roles-options"],
      revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
    });
    if (rolesRes.ok) {
      const roleOptions = parseApiResponseDataSafe<RbacRoleSummary[]>(
        rolesRes.data,
        "getRoleOptions",
      );
      roleOptionsSeeder = <RoleOptionsCacheSeeder data={roleOptions} />;
    }
  }

  return (
    <>
      <UsersListCacheSeeder queryArgs={queryArgs} data={usersData} />
      {roleOptionsSeeder}
      <UsersPageView />
    </>
  );
}
