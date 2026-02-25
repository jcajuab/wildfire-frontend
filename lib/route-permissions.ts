import type { PermissionType } from "@/types/permission";

/**
 * Single source of truth for dashboard routes and their required read permission.
 * Used by the sidebar (to show/hide nav items) and PageReadGuard (to allow/deny access).
 */

export const DASHBOARD_ROUTE_READ_ENTRIES = [
  { path: "/admin/displays", permission: "displays:read", title: "Displays" },
  { path: "/admin/content", permission: "content:read", title: "Content" },
  { path: "/admin/playlists", permission: "playlists:read", title: "Playlists" },
  { path: "/admin/schedules", permission: "schedules:read", title: "Schedules" },
  { path: "/admin/users", permission: "users:read", title: "Users" },
  { path: "/admin/roles", permission: "roles:read", title: "Roles" },
] as const;

/** Map path -> required read permission for PageReadGuard. */
export const ROUTE_READ_PERMISSION_MAP: Readonly<
  Record<string, PermissionType>
> = {
  ...(Object.fromEntries(
    DASHBOARD_ROUTE_READ_ENTRIES.map((e) => [e.path, e.permission]),
  ) as Record<string, string>),
  "/admin/logs": "audit:read",
  "/admin/settings": "settings:read",
};
