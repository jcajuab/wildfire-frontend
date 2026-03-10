import type { PermissionType } from "@/types/permission";

/**
 * Permission check mirroring backend authorization behavior.
 * Admin users bypass all checks; non-admin users require exact resource/action match.
 */
export function can(
  requiredPermission: PermissionType,
  userPermissions: PermissionType[],
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const [requiredResource, requiredAction] = requiredPermission.split(":");
  if (!requiredResource || !requiredAction) return false;

  return userPermissions.some((p) => {
    const [resource, action] = p.split(":");
    if (!resource || !action) return false;
    return resource === requiredResource && action === requiredAction;
  });
}
