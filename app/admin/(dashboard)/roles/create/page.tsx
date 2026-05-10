import type { ReactElement } from "react";

import type { RbacPermission } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { ROLE_CREATE_PATH } from "@/lib/role-paths";
import {
  getServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import { handleBootstrapResult, serverFetchJson } from "@/lib/server/api";

import {
  CreateRolePageView,
  PermissionsOptionsCacheSeeder,
} from "./create-role-page-client";

export default async function CreateRolePage(): Promise<ReactElement> {
  const session = resolveOptionalDashboardSession(await getServerSession());
  if (!session) {
    return <CreateRolePageView />;
  }
  const permissionsRes = await serverFetchJson<unknown>({
    session,
    path: "permissions/options",
    tags: ["permissions-options"],
    revalidate: 86400,
  });
  handleBootstrapResult(permissionsRes, ROLE_CREATE_PATH);

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
