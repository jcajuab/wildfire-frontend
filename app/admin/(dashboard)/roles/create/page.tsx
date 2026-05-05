import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { RbacPermission } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { ROLE_CREATE_PATH } from "@/lib/role-paths";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import {
  CreateRolePageView,
  PermissionsOptionsCacheSeeder,
} from "./create-role-page-client";

export default async function CreateRolePage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent(ROLE_CREATE_PATH)}`);
  }
  if (!sessionHasPermission(session, "roles:create")) {
    redirect("/unauthorized");
  }

  const permissionsRes = await serverFetchJson<unknown>({
    session,
    path: "permissions/options",
    tags: ["permissions-options"],
    revalidate: 86400,
  });

  if (!permissionsRes.ok) {
    redirect(`/login?redirectTo=${encodeURIComponent(ROLE_CREATE_PATH)}`);
  }

  const permissions = parseApiResponseDataSafe<RbacPermission[]>(
    permissionsRes.data,
    "getPermissions",
  );

  return (
    <>
      <PermissionsOptionsCacheSeeder data={permissions} />
      <CreateRolePageView />
    </>
  );
}
