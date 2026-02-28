import type { PermissionType } from "@/types/permission";

/**
 * Permission check mirroring backend authorization behavior.
 * Root users bypass all checks; non-root users require exact resource/action match.
 */
export function can(
  requiredPermission: PermissionType,
  userPermissions: readonly PermissionType[],
  isRoot = false,
): boolean {
  if (isRoot) return true;
  const [requiredResource, requiredAction] = requiredPermission.split(":");
  if (!requiredResource || !requiredAction) return false;

  return userPermissions.some((p) => {
    const [resource, action] = p.split(":");
    if (!resource || !action) return false;
    return resource === requiredResource && action === requiredAction;
  });
}
