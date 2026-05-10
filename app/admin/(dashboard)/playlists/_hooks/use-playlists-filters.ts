"use client";

import { useCallback } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import type {
  PlaylistSortFilter,
  PlaylistStatusFilter,
} from "@/components/playlists/playlist-filter-popover";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const PLAYLIST_SORT_VALUES = [
  "newest",
  "oldest",
  "updated-desc",
  "name-asc",
  "name-desc",
] as const;

export interface UsePlaylistsFiltersResult {
  statusFilter: PlaylistStatusFilter;
  ownerFilter: string;
  sortFilter: PlaylistSortFilter;
  search: string;
  page: number;
  setPage: (page: number) => void;
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleOwnerFilterChange: (value: string) => void;
  handleSortFilterChange: (value: PlaylistSortFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
}

export function usePlaylistsFilters(): UsePlaylistsFiltersResult {
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsStringLiteral(PLAYLIST_STATUS_VALUES).withDefault("all"),
    ownerId: parseAsString.withDefault("all"),
    sort: parseAsStringLiteral(PLAYLIST_SORT_VALUES).withDefault("newest"),
    page: parseAsInteger.withDefault(1),
  });

  const search = filters.q;
  const statusFilter = filters.status as PlaylistStatusFilter;
  const ownerFilter = filters.ownerId;
  const sortFilter = filters.sort as PlaylistSortFilter;
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

  const handleOwnerFilterChange = useCallback(
    (value: string) => {
      setFilters({ ownerId: value, page: 1 });
    },
    [setFilters],
  );

  const handleSortFilterChange = useCallback(
    (value: PlaylistSortFilter) => {
      setFilters({ sort: value, page: 1 });
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ status: "all", ownerId: "all", sort: "newest", page: 1 });
  }, [setFilters]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
  );

  return {
    statusFilter,
    ownerFilter,
    sortFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleOwnerFilterChange,
    handleSortFilterChange,
    handleClearFilters,
    handleSearchChange,
  };
}
