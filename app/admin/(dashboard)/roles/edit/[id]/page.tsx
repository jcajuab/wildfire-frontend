import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { RoleEditBootstrapResponse } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getRoleEditPath } from "@/lib/role-paths";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { AuthGate } from "@/app/admin/auth-gate";
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
  const session = await getServerSession();
  const { id: roleId } = await params;

  const editPath = getRoleEditPath(roleId);

  if (!session) {
    return <AuthGate redirectTo={editPath} />;
  }
  if (!sessionHasPermission(session, "roles:update")) {
    redirect("/unauthorized");
  }

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: `roles/${encodeURIComponent(roleId)}/bootstrap`,
    tags: ["role-edit-bootstrap"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  if (!bootstrapRes.ok) {
    return <AuthGate redirectTo={editPath} />;
  }

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
