import { ADMIN_TABLE_PAGE_SIZE } from "@/lib/admin-pagination";

export const ROLES_PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

const ROLE_SORT_FIELDS = ["name", "usersCount"] as const;
const ROLE_SORT_DIRECTIONS = ["asc", "desc"] as const;

export interface RolesListQueryFromParams {
  readonly page: number;
  readonly pageSize: number;
  readonly q: string | undefined;
  readonly sortBy: (typeof ROLE_SORT_FIELDS)[number];
  readonly sortDirection: (typeof ROLE_SORT_DIRECTIONS)[number];
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function rolesListQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = ROLES_PAGE_SIZE,
): RolesListQueryFromParams {
  const pageRaw = first(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;
  const q = first(searchParams.q)?.trim() ?? "";
  const sortFieldRaw = first(searchParams.sortField)?.trim() ?? "name";
  const sortDirRaw = first(searchParams.sortDir)?.trim() ?? "asc";

  const sortBy = ROLE_SORT_FIELDS.includes(
    sortFieldRaw as (typeof ROLE_SORT_FIELDS)[number],
  )
    ? (sortFieldRaw as (typeof ROLE_SORT_FIELDS)[number])
    : "name";

  const sortDirection = ROLE_SORT_DIRECTIONS.includes(
    sortDirRaw as (typeof ROLE_SORT_DIRECTIONS)[number],
  )
    ? (sortDirRaw as (typeof ROLE_SORT_DIRECTIONS)[number])
    : "asc";

  return {
    page,
    pageSize,
    q: q === "" ? undefined : q,
    sortBy,
    sortDirection,
  };
}
