import type { PlaylistListQuery } from "@/lib/api/playlists-api";

export const PLAYLISTS_PAGE_SIZE = 12;

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;

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

  return {
    page,
    pageSize,
    status,
    search,
    sortBy: "createdAt",
    sortDirection: "desc",
  };
}
