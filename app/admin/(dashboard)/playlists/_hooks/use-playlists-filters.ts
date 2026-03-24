"use client";

import { useCallback } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
  debounce,
} from "nuqs";
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
  const [filters, setFilters] = useQueryStates({
    q: parseAsString
      .withDefault("")
      .withOptions({ limitUrlUpdates: debounce(500) }),
    status: parseAsStringLiteral(PLAYLIST_STATUS_VALUES).withDefault("all"),
    page: parseAsInteger.withDefault(1),
  });

  const search = filters.q;
  const statusFilter = filters.status as PlaylistStatusFilter;
  const page = filters.page;

  const setPage = useCallback(
    (p: number) => setFilters({ page: p }),
    [setFilters],
  );

  const handleStatusFilterChange = useCallback(
    (value: PlaylistStatusFilter) => {
      setFilters({ status: value, page: 1 });
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ status: "all", page: 1 });
  }, [setFilters]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
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
