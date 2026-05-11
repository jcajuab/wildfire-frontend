import type { PermissionType } from "@/types/permission";
import {
  ROLE_CREATE_PATH,
  ROLE_EDIT_PATH_PREFIX,
  ROLE_INDEX_PATH,
} from "@/lib/role-paths";

export type RouteMatchMode = "exact" | "prefix";
export type SidebarSection = "core" | "manage";

export interface DashboardRouteReadPermissionEntry {
  readonly path: string;
  readonly permission?: PermissionType;
  readonly permissions?: readonly PermissionType[];
  readonly sidebarPermissions?: readonly PermissionType[];
  readonly title: string;
  readonly match: RouteMatchMode;
  readonly section: SidebarSection;
}

export type AdminRoutePermissionPredicate = (
  permission: PermissionType,
) => boolean;

export const UNAUTHORIZED_ROUTE = "/unauthorized";

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
    sidebarPermissions: ["content:read", "content:create"],
    title: "Content",
    match: "prefix",
    section: "core",
  },
  {
    path: "/admin/playlists",
    permission: "playlists:read",
    sidebarPermissions: ["playlists:read", "playlists:create"],
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

const MANAGE_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] =
  [
    {
      path: "/admin/users",
      permission: "users:read",
      title: "Users",
      match: "exact",
      section: "manage",
    },
    {
      path: ROLE_INDEX_PATH,
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
  ];

const NON_NAV_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] =
  [
    {
      path: "/admin/displays/display-groups",
      permissions: ["displays:create", "displays:update"],
      title: "Manage Display Groups",
      match: "exact",
      section: "core",
    },
    {
      path: "/admin/playlists/create",
      permission: "playlists:create",
      title: "Create Playlist",
      match: "exact",
      section: "core",
    },
    {
      path: "/admin/playlists/edit",
      permission: "playlists:update",
      title: "Edit Playlist",
      match: "prefix",
      section: "core",
    },
    {
      path: ROLE_CREATE_PATH,
      permission: "roles:create",
      title: "Create Role",
      match: "exact",
      section: "manage",
    },
    {
      path: ROLE_EDIT_PATH_PREFIX,
      permission: "roles:update",
      title: "Edit Role",
      match: "prefix",
      section: "manage",
    },
  ];

export const DASHBOARD_ROUTE_READ_ENTRIES: readonly DashboardRouteReadPermissionEntry[] =
  [...CORE_ROUTE_READ_ENTRIES, ...MANAGE_ROUTE_READ_ENTRIES];

export const ROUTE_READ_PERMISSION_ENTRIES: readonly DashboardRouteReadPermissionEntry[] =
  [...NON_NAV_ROUTE_READ_ENTRIES, ...DASHBOARD_ROUTE_READ_ENTRIES];

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

  return (
    currentPath === candidatePath || currentPath.startsWith(`${candidatePath}/`)
  );
};

export const getRequiredReadPermission = (
  pathname: string,
): PermissionType | null => {
  return getRequiredReadPermissions(pathname)[0] ?? null;
};

export const getRequiredReadPermissions = (
  pathname: string,
): readonly PermissionType[] => {
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

  if (bestMatch == null) return [];
  if (bestMatch.permissions != null) return bestMatch.permissions;
  return bestMatch.permission == null ? [] : [bestMatch.permission];
};

export const getRoutesBySection = (
  section: keyof typeof ROUTE_READ_ENTRIES_BY_SECTION,
): readonly DashboardRouteReadPermissionEntry[] =>
  ROUTE_READ_ENTRIES_BY_SECTION[section];

export const getFirstPermittedAdminRoute = (
  hasPermission: AdminRoutePermissionPredicate,
): string | null => {
  const first = DASHBOARD_ROUTE_READ_ENTRIES.find((entry) =>
    entry.permission == null ? true : hasPermission(entry.permission),
  );
  return first?.path ?? null;
};

export const getSidebarVisibilityPermissions = (
  entry: DashboardRouteReadPermissionEntry,
): readonly PermissionType[] => {
  if (entry.sidebarPermissions != null) {
    return entry.sidebarPermissions;
  }

  if (entry.permissions != null) {
    return entry.permissions;
  }

  return entry.permission == null ? [] : [entry.permission];
};

export const isSidebarRouteVisible = (
  entry: DashboardRouteReadPermissionEntry,
  hasPermission: AdminRoutePermissionPredicate,
): boolean =>
  getSidebarVisibilityPermissions(entry).every((permission) =>
    hasPermission(permission),
  );

export const getFirstVisibleAdminRoute = (
  hasPermission: AdminRoutePermissionPredicate,
): string | null => {
  const first = DASHBOARD_ROUTE_READ_ENTRIES.find((entry) =>
    isSidebarRouteVisible(entry, hasPermission),
  );
  return first?.path ?? null;
};
