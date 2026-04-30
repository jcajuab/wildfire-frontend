export const USERS_PAGE_SIZE = 10;

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;

export interface UsersListQueryFromParams {
  readonly page: number;
  readonly pageSize: number;
  readonly q: string | undefined;
  readonly sortBy: "name" | "lastSeenAt";
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

  return {
    page,
    pageSize,
    q: q === "" ? undefined : q,
    sortBy: sortField === "lastSeen" ? "lastSeenAt" : "name",
    sortDirection,
  };
}
