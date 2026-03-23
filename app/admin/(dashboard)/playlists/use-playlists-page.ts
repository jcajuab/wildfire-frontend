"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  type PlaylistListQuery,
  useDeletePlaylistMutation,
  useListPlaylistsQuery,
} from "@/lib/api/playlists-api";
import { mapBackendPlaylistSummary } from "@/lib/mappers/playlist-mapper";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import type { PlaylistStatusFilter } from "@/components/playlists/playlist-filter-popover";
import type { PlaylistSummary } from "@/types/playlist";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
export const PAGE_SIZE = 12;

export interface UsePlaylistsPageResult {
  // Permissions
  canUpdatePlaylist: boolean;
  canDeletePlaylist: boolean;

  // Filter state
  statusFilter: PlaylistStatusFilter;
  search: string;
  page: number;

  // Query data
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

const POLLING_INTERVAL_MS = 30_000;

export function usePlaylistsPage(): UsePlaylistsPageResult {
  const router = useRouter();
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");

  const [statusFilter, setStatusFilter] =
    useQueryEnumState<PlaylistStatusFilter>(
      "status",
      "all",
      PLAYLIST_STATUS_VALUES,
    );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const [playlistToDelete, setPlaylistToDelete] =
    useState<PlaylistSummary | null>(null);

  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.length > 0 ? search : undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
    }),
    [page, search, statusFilter],
  );

  const { data: playlistsData } = useListPlaylistsQuery(playlistQuery, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const [deletePlaylist] = useDeletePlaylistMutation();

  const deleteDialogOpen = playlistToDelete !== null;

  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistSummary),
    [playlistsData?.items],
  );

  const totalPlaylists = playlistsData?.total ?? 0;

  const handleStatusFilterChange = useCallback(
    (value: PlaylistStatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setPage(1);
  }, [setStatusFilter, setPage]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

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
    canUpdatePlaylist,
    canDeletePlaylist,
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
