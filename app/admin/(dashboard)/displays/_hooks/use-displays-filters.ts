"use client";

import { useCallback, useDeferredValue } from "react";
import {
  useQueryEnumState,
  useQueryListState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { DisplayStatusFilter } from "@/components/displays/display-status-tabs";
import type { DisplayOutputFilter, DisplaySortField } from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
const DISPLAY_SORT_VALUES = ["alphabetical", "status", "location"] as const;

export function useDisplaysFilters() {
  const [statusFilter, setStatusFilter] =
    useQueryEnumState<DisplayStatusFilter>(
      "status",
      "all",
      DISPLAY_STATUS_VALUES,
    );
  const [sortBy, setSortBy] = useQueryEnumState<DisplaySortField>(
    "sort",
    "alphabetical",
    DISPLAY_SORT_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);
  const [groupFilters, setGroupFilters] = useQueryListState("groups", []);
  const [outputFilter, setOutputFilter] = useQueryStringState("output", "all");
  const deferredSearch = useDeferredValue(search);

  const normalizedOutputFilter: DisplayOutputFilter =
    outputFilter.length > 0 ? outputFilter : "all";

  const handleStatusFilterChange = useCallback(
    (value: DisplayStatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleSortChange = useCallback(
    (value: DisplaySortField) => {
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

  const handleGroupFilterChange = useCallback(
    (value: readonly string[]) => {
      setGroupFilters(value);
      setPage(1);
    },
    [setGroupFilters, setPage],
  );

  const handleOutputFilterChange = useCallback(
    (value: DisplayOutputFilter) => {
      setOutputFilter(value);
      setPage(1);
    },
    [setOutputFilter, setPage],
  );

  const handleClearFilters = useCallback(() => {
    setGroupFilters([]);
    setOutputFilter("all");
    setPage(1);
  }, [setGroupFilters, setOutputFilter, setPage]);

  return {
    statusFilter,
    sortBy,
    search,
    page,
    setPage,
    groupFilters,
    setGroupFilters,
    outputFilter,
    setOutputFilter,
    normalizedOutputFilter,
    deferredSearch,
    handleStatusFilterChange,
    handleSortChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
  };
}
