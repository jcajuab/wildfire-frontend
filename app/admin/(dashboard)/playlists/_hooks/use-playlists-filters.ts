"use client";

import { useCallback } from "react";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { PlaylistStatusFilter } from "@/components/playlists/playlist-filter-popover";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;

export interface UsePlaylistsFiltersResult {
  statusFilter: PlaylistStatusFilter;
  search: string;
  page: number;
  setPage: (page: number) => void;
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
}

export function usePlaylistsFilters(): UsePlaylistsFiltersResult {
  const [statusFilter, setStatusFilter] =
    useQueryEnumState<PlaylistStatusFilter>(
      "status",
      "all",
      PLAYLIST_STATUS_VALUES,
    );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

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

  return {
    statusFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
  };
}
