import type { PermissionType } from "@/types/permission";

export type RouteMatchMode = "exact" | "prefix";
export type SidebarSection = "core" | "manage";

export interface DashboardRouteReadPermissionEntry {
  readonly path: string;
  readonly permission: PermissionType;
  readonly title: string;
  readonly match: RouteMatchMode;
  readonly section: SidebarSection;
}

const normalizeRoutePath = (path: string): string => {
  const normalized = `/${path}`.replace(/\/+/g, "/").replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
};

/**
 * Single source of truth for dashboard routes and their required read permission.
 * Used by the sidebar (to show/hide nav items) and PageReadGuard (to allow/deny access).
 */
const CORE_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] = [
  {
    path: "/admin/displays",
    permission: "displays:read",
    title: "Displays",
    match: "prefix",
    section: "core",
  },
  {
    path: "/admin/content",
    permission: "content:read",
    title: "Content",
    match: "prefix",
    section: "core",
  },
  {
    path: "/admin/playlists",
    permission: "playlists:read",
    title: "Playlists",
    match: "prefix",
    section: "core",
  },
  {
    path: "/admin/schedules",
    permission: "schedules:read",
    title: "Schedules",
    match: "prefix",
    section: "core",
  },
];

const MANAGE_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] = [
  {
    path: "/admin/users",
    permission: "users:read",
    title: "Users",
    match: "exact",
    section: "manage",
  },
  {
    path: "/admin/roles",
    permission: "roles:read",
    title: "Roles",
    match: "exact",
    section: "manage",
  },
  {
    path: "/admin/logs",
    permission: "audit:read",
    title: "Logs",
    match: "exact",
    section: "manage",
  },
  {
    path: "/admin/settings",
    permission: "settings:read",
    title: "Settings",
    match: "exact",
    section: "manage",
  },
];

export const DASHBOARD_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] = [
  ...CORE_ROUTE_READ_ENTRIES,
  ...MANAGE_ROUTE_READ_ENTRIES,
];

export const ROUTE_READ_PERMISSION_ENTRIES: readonly DashboardRouteReadPermissionEntry[] =
  DASHBOARD_ROUTE_READ_ENTRIES;

export const ROUTE_READ_ENTRIES_BY_SECTION: Readonly<{
  core: readonly DashboardRouteReadPermissionEntry[];
  manage: readonly DashboardRouteReadPermissionEntry[];
}> = {
  core: CORE_ROUTE_READ_ENTRIES,
  manage: MANAGE_ROUTE_READ_ENTRIES,
};

export const isPathMatch = (
  pathname: string,
  entryPath: string,
  mode: RouteMatchMode = "exact",
): boolean => {
  const currentPath = normalizeRoutePath(pathname);
  const candidatePath = normalizeRoutePath(entryPath);

  if (candidatePath === "/") {
    return currentPath === "/";
  }

  if (mode === "exact") {
    return currentPath === candidatePath;
  }

  return currentPath === candidatePath || currentPath.startsWith(`${candidatePath}/`);
};

export const getRequiredReadPermission = (
  pathname: string,
): PermissionType | null => {
  const normalizedPath = normalizeRoutePath(pathname);

  let bestMatch: DashboardRouteReadPermissionEntry | undefined;

  for (const entry of ROUTE_READ_PERMISSION_ENTRIES) {
    if (!isPathMatch(normalizedPath, entry.path, entry.match)) {
      continue;
    }

    if (bestMatch == null || entry.path.length > bestMatch.path.length) {
      bestMatch = entry;
    }
  }

  return bestMatch?.permission ?? null;
};

export const getRoutesBySection = (
  section: keyof typeof ROUTE_READ_ENTRIES_BY_SECTION,
): readonly DashboardRouteReadPermissionEntry[] =>
  ROUTE_READ_ENTRIES_BY_SECTION[section];
