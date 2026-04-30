import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { RoleEditBootstrapResponse } from "@/lib/api/rbac-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getRoleEditPath } from "@/lib/role-paths";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

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

  const redirectTo = encodeURIComponent(getRoleEditPath(roleId));

  if (!session) {
    redirect(`/login?redirectTo=${redirectTo}`);
  }
  if (!sessionHasPermission(session, "roles:update")) {
    redirect("/unauthorized");
  }

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: `roles/${encodeURIComponent(roleId)}/bootstrap`,
    tags: ["roles", "permissions", "users"],
    revalidate: 30,
  });

  if (!bootstrapRes.ok) {
    redirect(`/login?redirectTo=${redirectTo}`);
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
