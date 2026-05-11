import { ADMIN_TABLE_PAGE_SIZE } from "@/lib/admin-pagination";

export const USERS_PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

const USER_SORT_FIELDS = ["name", "email", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
const USER_TYPE_FILTERS = ["dcism", "invited", "banned"] as const;

export interface UsersListQueryFromParams {
  readonly page: number;
  readonly pageSize: number;
  readonly q: string | undefined;
  readonly roleId: string | undefined;
  readonly userType: (typeof USER_TYPE_FILTERS)[number] | undefined;
  readonly sortBy: "name" | "email" | "lastSeenAt";
  readonly sortDirection: (typeof USER_SORT_DIRECTIONS)[number];
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function usersListQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = USERS_PAGE_SIZE,
): UsersListQueryFromParams {
  const pageRaw = first(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;
  const q = first(searchParams.q)?.trim() ?? "";
  const roleIdRaw = first(searchParams.roleId)?.trim() ?? "all";
  const userTypeRaw = first(searchParams.userType)?.trim() ?? "all";
  const sortFieldRaw = first(searchParams.sortField)?.trim() ?? "name";
  const sortDirRaw = first(searchParams.sortDir)?.trim() ?? "asc";

  const sortField = USER_SORT_FIELDS.includes(
    sortFieldRaw as (typeof USER_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as (typeof USER_SORT_FIELDS)[number])
    : "name";

  const sortDirection = USER_SORT_DIRECTIONS.includes(
    sortDirRaw as (typeof USER_SORT_DIRECTIONS)[number],
  )
    ? (sortDirRaw as (typeof USER_SORT_DIRECTIONS)[number])
    : "asc";
  const userType = USER_TYPE_FILTERS.includes(
    userTypeRaw as (typeof USER_TYPE_FILTERS)[number],
  )
    ? (userTypeRaw as (typeof USER_TYPE_FILTERS)[number])
    : undefined;

  return {
    page,
    pageSize,
    q: q === "" ? undefined : q,
    roleId: roleIdRaw === "" || roleIdRaw === "all" ? undefined : roleIdRaw,
    userType,
    sortBy: sortField === "lastSeen" ? "lastSeenAt" : sortField,
    sortDirection,
  };
}
