import type { ReactElement } from "react";

import type { RoleEditBootstrapResponse } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getRoleEditPath } from "@/lib/role-paths";
import {
  getServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  EditRolePageView,
  RoleEditBootstrapCacheSeeder,
} from "./edit-role-page-client";

interface EditRolePageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function EditRolePage({
  params,
}: EditRolePageProps): Promise<ReactElement> {
  const { id: roleId } = await params;
  const editPath = getRoleEditPath(roleId);

  const session = resolveOptionalDashboardSession(await getServerSession());
  if (!session) {
    return <EditRolePageView />;
  }
  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: `roles/${encodeURIComponent(roleId)}/bootstrap`,
    tags: ["role-edit-bootstrap"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(bootstrapRes, editPath);

  const bootstrapData = parseApiResponseDataSafe<RoleEditBootstrapResponse>(
    bootstrapRes.data,
    "getRoleEditBootstrap",
  );

  return (
    <>
      <RoleEditBootstrapCacheSeeder roleId={roleId} data={bootstrapData} />
      <EditRolePageView />
    </>
  );
}
