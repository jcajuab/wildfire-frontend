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
    case "download":
      return `Download ${resource}`;
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

function formatPermissionResource(resource: string): string {
  if (resource === "*") return "all resources";

  switch (resource.toLowerCase()) {
    case "audit":
      return "audit logs";
    default:
      return resource.toLowerCase();
  }
}

/**
 * Friendly permission description for role assignment tooltips.
 */
export function formatPermissionTooltipDescription(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  const action = permission.action.toLowerCase();
  const resource = formatPermissionResource(permission.resource);

  if (permission.resource === "*" && action === "*") {
    return "Allows users with this role to manage all resources.";
  }

  switch (action) {
    case "read":
      return `Allows users with this role to view ${resource}.`;
    case "download":
      return `Allows users with this role to download ${resource}.`;
    case "create":
      return `Allows users with this role to create ${resource}.`;
    case "update":
      return `Allows users with this role to edit ${resource}.`;
    case "delete":
      return `Allows users with this role to delete ${resource}.`;
    case "*":
      return `Allows users with this role to manage ${resource}.`;
    default:
      return `Allows users with this role to ${action} ${resource}.`;
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
