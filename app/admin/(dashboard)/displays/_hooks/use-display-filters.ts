"use client";

import { useCallback } from "react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import type {
  DisplaySortFilter,
  DisplayStatusFilter,
} from "@/components/displays/display-filter-popover";
import type { DisplayOutputFilter } from "@/types/display";
import { normalizeDisplayOutputFilter } from "@/lib/display-output";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
const DISPLAY_SORT_VALUES = [
  "name-asc",
  "name-desc",
  "groups-desc",
  "groups-asc",
  "created-desc",
] as const;

const displayFiltersSchema = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(DISPLAY_STATUS_VALUES).withDefault("all"),
  sort: parseAsStringLiteral(DISPLAY_SORT_VALUES).withDefault("name-asc"),
  page: parseAsInteger.withDefault(1),
  groups: parseAsArrayOf(parseAsString, ",").withDefault([]),
  output: parseAsString.withDefault("all"),
};

export function useDisplayFilters() {
  const [filters, setFilters] = useQueryStates(displayFiltersSchema);

  const normalizedOutputFilter: DisplayOutputFilter =
    normalizeDisplayOutputFilter(filters.output);

  const handleStatusFilterChange = useCallback(
    (value: DisplayStatusFilter) => {
      setFilters({
        status: value as (typeof DISPLAY_STATUS_VALUES)[number],
        page: 1,
      });
    },
    [setFilters],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
  );

  const handleSortChange = useCallback(
    (value: DisplaySortFilter) => {
      setFilters({ sort: value, page: 1 });
    },
    [setFilters],
  );

  const handleGroupFilterChange = useCallback(
    (value: readonly string[]) => {
      setFilters({ groups: [...value], page: 1 });
    },
    [setFilters],
  );

  const handleOutputFilterChange = useCallback(
    (value: DisplayOutputFilter) => {
      setFilters({ output: normalizeDisplayOutputFilter(value), page: 1 });
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: "all",
      sort: "name-asc",
      groups: [],
      output: "all",
      page: 1,
    });
  }, [setFilters]);

  return {
    statusFilter: filters.status,
    sortFilter: filters.sort,
    search: filters.q,
    page: filters.page,
    setPage: (page: number) => setFilters({ page }),
    groupFilters: filters.groups,
    normalizedOutputFilter,
    handleStatusFilterChange,
    handleSortChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
  };
}
