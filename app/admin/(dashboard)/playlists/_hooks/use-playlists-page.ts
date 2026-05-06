"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  playlistsApi,
  type BackendPlaylistListResponse,
  type PlaylistListQuery,
  useDeletePlaylistMutation,
  useListPlaylistsQuery,
} from "@/lib/api/playlists-api";
import { mapBackendPlaylistSummary } from "@/lib/mappers/playlist-mapper";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import type { PlaylistStatusFilter } from "@/components/playlists/playlist-filter-popover";
import type { PlaylistSummary } from "@/types/playlist";
import { PLAYLISTS_PAGE_SIZE } from "@/lib/playlists-search-params";
import { usePlaylistsFilters } from "./use-playlists-filters";

export const PAGE_SIZE = PLAYLISTS_PAGE_SIZE;

export interface UsePlaylistsPageResult {
  // Permissions
  canCreatePlaylist: boolean;
  canUpdatePlaylist: boolean;
  canDeletePlaylist: boolean;

  // Filter state
  statusFilter: PlaylistStatusFilter;
  search: string;
  page: number;

  // Query data
  isLoading: boolean;
  isFetching: boolean;
  playlists: PlaylistSummary[];
  totalPlaylists: number;
  playlistToDelete: PlaylistSummary | null;
  deleteDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setPlaylistToDelete: (playlist: PlaylistSummary | null) => void;

  // Handlers
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
  handleEditPlaylist: (playlist: PlaylistSummary) => void;
  handleDeletePlaylist: (playlist: PlaylistSummary) => void;
  deletePlaylistMutation: (id: string) => Promise<void>;
}

export interface InitialPlaylistsList {
  readonly queryArgs: PlaylistListQuery;
  readonly data: BackendPlaylistListResponse;
}

interface UsePlaylistsPageOptions {
  readonly initialList?: InitialPlaylistsList;
}

function normalizedQueryKey(query: PlaylistListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    status: query.status ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
  });
}

export function usePlaylistsPage({
  initialList,
}: UsePlaylistsPageOptions = {}): UsePlaylistsPageResult {
  const router = useRouter();
  const canCreatePlaylist = useCan("playlists:create");
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");

  const {
    statusFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
  } = usePlaylistsFilters();
  const debouncedSearch = useDebounce(search, 500);

  const [playlistToDelete, setPlaylistToDelete] =
    useState<PlaylistSummary | null>(null);

  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      sortBy: "createdAt",
      sortDirection: "desc",
    }),
    [page, debouncedSearch, statusFilter],
  );
  const playlistQueryKey = useMemo(
    () => normalizedQueryKey(playlistQuery),
    [playlistQuery],
  );
  const initialListQueryKey = useMemo(
    () =>
      initialList != null ? normalizedQueryKey(initialList.queryArgs) : null,
    [initialList],
  );
  const isInitialListQuery =
    initialListQueryKey != null && initialListQueryKey === playlistQueryKey;

  const {
    data: queriedPlaylistsData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
  } = useListPlaylistsQuery(playlistQuery, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: isInitialListQuery,
  });
  const cachedInitialList = playlistsApi.endpoints.listPlaylists.useQueryState(
    playlistQuery,
    { skip: !isInitialListQuery },
  );
  const playlistsData =
    queriedPlaylistsData ??
    cachedInitialList.data ??
    (isInitialListQuery ? initialList?.data : undefined);
  const isLoading =
    playlistsData == null && (isInitialListQuery ? false : queryIsLoading);
  const isFetching = isInitialListQuery
    ? cachedInitialList.isFetching
    : queryIsFetching;
  const [deletePlaylist] = useDeletePlaylistMutation();

  const deleteDialogOpen = playlistToDelete !== null;

  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistSummary),
    [playlistsData?.items],
  );

  const totalPlaylists = playlistsData?.total ?? 0;

  const handleEditPlaylist = useCallback(
    (playlist: PlaylistSummary) => {
      router.push(getPlaylistEditPath(playlist.id));
    },
    [router],
  );

  const handleDeletePlaylist = useCallback((playlist: PlaylistSummary) => {
    setPlaylistToDelete(playlist);
  }, []);

  const deletePlaylistById = useCallback(
    async (id: string) => {
      await deletePlaylist(id).unwrap();
    },
    [deletePlaylist],
  );

  return {
    canCreatePlaylist,
    canUpdatePlaylist,
    canDeletePlaylist,
    isLoading,
    isFetching,
    statusFilter,
    search,
    page,
    playlists,
    totalPlaylists,
    playlistToDelete,
    deleteDialogOpen,
    setPage,
    setPlaylistToDelete,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleEditPlaylist,
    handleDeletePlaylist,
    deletePlaylistMutation: deletePlaylistById,
  };
}
