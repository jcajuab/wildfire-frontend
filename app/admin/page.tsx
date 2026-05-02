import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { can } from "@/lib/permissions";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import { getServerSession } from "@/lib/server/auth";
import type { PermissionType } from "@/types/permission";

import { AdminIndexFallbackRedirect } from "./admin-index-fallback-redirect";

export default async function AdminIndexPage(): Promise<ReactNode> {
  const session = await getServerSession();

  if (session) {
    const predicate = (permission: PermissionType) =>
      can(permission, session.permissions, session.user.isAdmin);

    const target =
      getFirstPermittedAdminRoute(predicate) ?? UNAUTHORIZED_ROUTE;

    redirect(target);
  }

  return <AdminIndexFallbackRedirect />;
}
