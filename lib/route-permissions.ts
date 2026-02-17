/**
 * Single source of truth for dashboard routes and their required read permission.
 * Used by the sidebar (to show/hide nav items) and PageReadGuard (to allow/deny access).
 */

export const DASHBOARD_ROUTE_READ_ENTRIES = [
  { path: "/displays", permission: "devices:read", title: "Displays" },
  { path: "/content", permission: "content:read", title: "Content" },
  { path: "/playlists", permission: "playlists:read", title: "Playlists" },
  { path: "/schedules", permission: "schedules:read", title: "Schedules" },
  { path: "/users", permission: "users:read", title: "Users" },
  { path: "/roles", permission: "roles:read", title: "Roles" },
] as const;

/** Map path -> required read permission for PageReadGuard. */
export const ROUTE_READ_PERMISSION_MAP: Readonly<Record<string, string>> = {
  ...(Object.fromEntries(
    DASHBOARD_ROUTE_READ_ENTRIES.map((e) => [e.path, e.permission]),
  ) as Record<string, string>),
  "/logs": "*:manage",
};
