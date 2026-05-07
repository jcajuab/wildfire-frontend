import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  RbacRoleSummary,
  RbacUser,
  RbacUserListQuery,
} from "@/lib/api/rbac-api";
import type { InvitationRecord, InvitationListResponse } from "@/types/invitation";
import { parseApiResponseDataSafe, parseApiListResponseSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  USERS_PAGE_SIZE,
  usersListQueryFromSearchParams,
} from "@/lib/users-search-params";
import { cacheLife, cacheTag } from "next/cache";

import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

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

async function getCachedUsersList(params: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  q?: string;
  roleId?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:users-list");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "users",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  return transformPaginatedListResponse<RbacUser>(res.data, "getUsers");
}

async function getCachedRoleOptions() {
  "use cache: private";
  cacheTag("wildfire:roles-options");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "roles/options",
    searchParams: { limit: 100 },
    revalidate: false,
  });

  if (!res.ok) return null;
  return parseApiResponseDataSafe<RbacRoleSummary[]>(
    res.data,
    "getRoleOptions",
  );
}

async function getCachedInvitations(params: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
}) {
  "use cache: private";
  cacheTag("wildfire:invitations");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "auth/invitations",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  const parsed = parseApiListResponseSafe<InvitationRecord>(
    res.data,
    "getInvitations",
  );
  return {
    items: parsed.data,
    total: parsed.meta.total,
    page: parsed.meta.page,
    pageSize: parsed.meta.pageSize,
  } satisfies InvitationListResponse;
}

export default async function UsersPage({
  searchParams,
}: UsersPageProps): Promise<ReactElement> {
  const session = resolveSession(await getCachedServerSession(), "/admin/users");
  if (!session) {
    return <UsersPageView />;
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
    roleId: q.roleId,
    sortBy: q.sortBy,
    sortDirection: q.sortDirection,
  };

  const canReadRoles = sessionHasPermission(session, "roles:read");
  const canCreateUser = sessionHasPermission(session, "users:create");

  const [usersData, roleOptions, invitationsData] = await Promise.all([
    getCachedUsersList({
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? USERS_PAGE_SIZE,
      sortBy: queryArgs.sortBy ?? "name",
      sortDirection: queryArgs.sortDirection ?? "asc",
      q: queryArgs.q,
      roleId: queryArgs.roleId,
    }),
    canReadRoles ? getCachedRoleOptions() : null,
    canCreateUser
      ? getCachedInvitations({
          page: 1,
          pageSize: USERS_PAGE_SIZE,
          sortBy: "createdAt",
          sortDirection: "desc",
        })
      : null,
  ]);

  return (
    <>
      {usersData ? <UsersListCacheSeeder queryArgs={queryArgs} data={usersData} /> : null}
      {roleOptions ? <RoleOptionsCacheSeeder data={roleOptions} /> : null}
      <UsersPageView initialInvitations={invitationsData ?? undefined} />
    </>
  );
}
