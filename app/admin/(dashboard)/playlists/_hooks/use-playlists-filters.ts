"use client";

import { useCallback } from "react";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { PlaylistSortField, PlaylistStatusFilter } from "@/types/playlist";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const PLAYLIST_SORT_VALUES = ["recent", "name"] as const;

export function usePlaylistsFilters() {
  const [statusFilter, setStatusFilter] =
    useQueryEnumState<PlaylistStatusFilter>(
      "status",
      "all",
      PLAYLIST_STATUS_VALUES,
    );
  const [sortBy, setSortBy] = useQueryEnumState<PlaylistSortField>(
    "sort",
    "recent",
    PLAYLIST_SORT_VALUES,
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

  const handleSortChange = useCallback(
    (value: PlaylistSortField) => {
      setSortBy(value);
      setPage(1);
    },
    [setSortBy, setPage],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  return {
    statusFilter,
    sortBy,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleSortChange,
    handleSearchChange,
  };
}
