"use client";

import { useCallback, useDeferredValue } from "react";
import {
  useQueryEnumState,
  useQueryListState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type { DisplayOutputFilter } from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;

export function useDisplayFilters() {
  const [statusFilter, setStatusFilter] =
    useQueryEnumState<DisplayStatusFilter>(
      "status",
      "all",
      DISPLAY_STATUS_VALUES,
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
    setStatusFilter("all");
    setGroupFilters([]);
    setOutputFilter("all");
    setPage(1);
  }, [setStatusFilter, setGroupFilters, setOutputFilter, setPage]);

  return {
    statusFilter,
    search,
    deferredSearch,
    page,
    setPage,
    groupFilters,
    normalizedOutputFilter,
    handleStatusFilterChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
  };
}
