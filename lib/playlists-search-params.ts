import type { PlaylistListQuery } from "@/lib/api/playlists-api";

export const PLAYLISTS_PAGE_SIZE = 12;

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const PLAYLIST_SORT_VALUES = [
  "newest",
  "oldest",
  "updated-desc",
  "name-asc",
  "name-desc",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function playlistsListQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = PLAYLISTS_PAGE_SIZE,
): PlaylistListQuery {
  const pageRaw = first(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  const searchRaw = first(searchParams.q)?.trim() ?? "";
  const search = searchRaw === "" ? undefined : searchRaw;

  const statusRaw = first(searchParams.status)?.trim() ?? "all";
  const status =
    statusRaw !== "all" &&
    (PLAYLIST_STATUS_VALUES as readonly string[]).includes(statusRaw)
      ? (statusRaw as PlaylistListQuery["status"])
      : undefined;

  const ownerIdRaw = first(searchParams.ownerId)?.trim();
  const ownerId =
    ownerIdRaw != null && UUID_PATTERN.test(ownerIdRaw)
      ? ownerIdRaw
      : undefined;

  const sortRaw = first(searchParams.sort)?.trim() ?? "newest";
  const sort = (PLAYLIST_SORT_VALUES as readonly string[]).includes(sortRaw)
    ? sortRaw
    : "newest";
  const sortBy =
    sort === "name-asc" || sort === "name-desc"
      ? "name"
      : sort === "updated-desc"
        ? "updatedAt"
        : "createdAt";
  const sortDirection =
    sort === "oldest" || sort === "name-asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    status,
    ownerId,
    search,
    sortBy,
    sortDirection,
  };
}
