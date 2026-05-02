import { redirect } from "next/navigation";

import { can } from "@/lib/permissions";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import { getServerSession } from "@/lib/server/auth";
import type { PermissionType } from "@/types/permission";

export default async function AdminIndexPage(): Promise<void> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin")}`);
  }

  const predicate = (permission: PermissionType) =>
    can(permission, session.permissions, session.user.isAdmin);

  const target =
    getFirstPermittedAdminRoute(predicate) ?? UNAUTHORIZED_ROUTE;

  redirect(target);
}
