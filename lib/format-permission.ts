function capitalizeResource(resource: string): string {
  if (resource === "*") return "All";
  return resource.charAt(0).toUpperCase() + resource.slice(1).toLowerCase();
}

/**
 * Human-readable label for a permission (resource:action).
 * E.g. "content:read" → "Content: Read".
 */
export function formatPermissionLabel(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  const resource = capitalizeResource(permission.resource);
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
  const resource = capitalizeResource(permission.resource);
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

function formatPermissionResource(resource: string): string {
  if (resource === "*") return "all resources";

  switch (resource.toLowerCase()) {
    case "audit":
      return "audit logs";
    default:
      return resource.toLowerCase();
  }
}

function getPermissionActionLabel(action: string): string {
  switch (action) {
    case "read":
      return "view";
    case "create":
      return "create";
    case "update":
      return "edit";
    case "delete":
      return "delete";
    case "*":
      return "manage";
    default:
      return action;
  }
}

function getPermissionImpactSentence(action: string, resource: string): string {
  if (resource === "all resources" && action === "*") {
    return "This includes full control over every permission-protected area of the system.";
  }

  if (resource === "audit logs") {
    return "This exposes a record of system activity for monitoring, investigations, and compliance checks.";
  }

  switch (action) {
    case "read":
      return `This lets them access existing ${resource} data without changing it.`;
    case "create":
      return `This lets them add new ${resource} records that become available to other users.`;
    case "update":
      return `This lets them change existing ${resource} records and alter what others see.`;
    case "delete":
      return `This lets them remove ${resource} records and can permanently affect availability.`;
    case "*":
      return `This includes viewing, creating, editing, and deleting ${resource}.`;
    default:
      return `This grants the ${action} operation for ${resource} in the system.`;
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
  const actionLabel = getPermissionActionLabel(action);
  const firstSentence = `Allows users with this role to ${actionLabel} ${resource}.`;
  const secondSentence = getPermissionImpactSentence(action, resource);

  return `${firstSentence} ${secondSentence}`;
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
