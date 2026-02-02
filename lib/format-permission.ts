/**
 * Human-readable label for a permission (resource:action).
 * E.g. "content:read" → "Content: Read".
 */
export function formatPermissionLabel(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  const resource =
    permission.resource === "*"
      ? "All"
      : permission.resource.charAt(0).toUpperCase() +
        permission.resource.slice(1).toLowerCase();
  const action =
    permission.action === "*"
      ? "Manage"
      : permission.action.charAt(0).toUpperCase() +
        permission.action.slice(1).toLowerCase();
  return `${resource}: ${action}`;
}

/**
 * Readable label for UI display (action-first, verb form).
 * E.g. "content:read" → "View Content", "content:create" → "Create Content".
 */
export function formatPermissionReadableLabel(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  const resource =
    permission.resource === "*"
      ? "All"
      : permission.resource.charAt(0).toUpperCase() +
        permission.resource.slice(1).toLowerCase();
  const action = permission.action.toLowerCase();
  if (permission.resource === "*" && action === "*") return "Manage all";
  switch (action) {
    case "read":
      return `View ${resource}`;
    case "create":
      return `Create ${resource}`;
    case "update":
      return `Edit ${resource}`;
    case "delete":
      return `Delete ${resource}`;
    case "*":
      return `Manage ${resource}`;
    default:
      return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource}`;
  }
}

/**
 * Short identifier for tooltips (e.g. "content:read").
 */
export function formatPermissionId(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  return `${permission.resource}:${permission.action}`;
}
