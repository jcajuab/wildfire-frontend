/**
 * Design list of permissions (resource + action) shown in the Roles UI.
 * Matches the full permission grid from the design; API permissions are
 * merged by resource+action to get IDs for toggling and persistence.
 */
export const DESIGN_PERMISSIONS: ReadonlyArray<{
  readonly resource: string;
  readonly action: string;
}> = [
  { resource: "displays", action: "create" },
  { resource: "displays", action: "read" },
  { resource: "displays", action: "update" },
  { resource: "displays", action: "delete" },
  { resource: "content", action: "create" },
  { resource: "content", action: "read" },
  { resource: "content", action: "update" },
  { resource: "content", action: "delete" },
  { resource: "playlists", action: "create" },
  { resource: "playlists", action: "read" },
  { resource: "playlists", action: "update" },
  { resource: "playlists", action: "delete" },
  { resource: "schedules", action: "create" },
  { resource: "schedules", action: "read" },
  { resource: "schedules", action: "update" },
  { resource: "schedules", action: "delete" },
  { resource: "users", action: "create" },
  { resource: "users", action: "read" },
  { resource: "users", action: "update" },
  { resource: "users", action: "delete" },
  { resource: "roles", action: "create" },
  { resource: "roles", action: "read" },
  { resource: "roles", action: "update" },
  { resource: "roles", action: "delete" },
  { resource: "audit", action: "read" },
];

export interface DesignPermissionWithId {
  readonly resource: string;
  readonly action: string;
  /** API permission id when this permission exists in the database. */
  readonly id: string | null;
}

/**
 * Merges design permissions with API permissions by resource+action.
 * Result has one entry per design permission; id is set when the API has that permission.
 */
export function mergeDesignPermissionsWithApi(
  apiPermissions: ReadonlyArray<{
    id: string;
    resource: string;
    action: string;
  }>,
): DesignPermissionWithId[] {
  const byKey = new Map<string, string>();
  for (const p of apiPermissions) {
    byKey.set(`${p.resource}:${p.action}`, p.id);
  }
  return DESIGN_PERMISSIONS.map(({ resource, action }) => ({
    resource,
    action,
    id: byKey.get(`${resource}:${action}`) ?? null,
  }));
}
