/**
 * Permission check: matches backend Permission.matches logic.
 * Required is "resource:action"; userPermissions are "resource:action" strings.
 * Resource "*" matches any resource; action "manage" matches any action.
 */
export function can(
  requiredPermission: string,
  userPermissions: string[],
): boolean {
  const [requiredResource, requiredAction] = requiredPermission.split(":");
  if (!requiredResource || !requiredAction) return false;

  return userPermissions.some((p) => {
    const [resource, action] = p.split(":");
    if (!resource || !action) return false;
    const resourceMatches = resource === "*" || resource === requiredResource;
    if (!resourceMatches) return false;
    if (action === "manage") return true;
    return action === requiredAction;
  });
}
