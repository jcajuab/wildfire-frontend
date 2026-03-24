"use client";

import { useCallback } from "react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type { DisplayOutputFilter } from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;

const displayFiltersSchema = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(DISPLAY_STATUS_VALUES).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  groups: parseAsArrayOf(parseAsString, ",").withDefault([]),
  output: parseAsString.withDefault("all"),
};

export function useDisplayFilters() {
  const [filters, setFilters] = useQueryStates(displayFiltersSchema);

  const normalizedOutputFilter: DisplayOutputFilter =
    filters.output.length > 0 ? filters.output : "all";

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

  const handleGroupFilterChange = useCallback(
    (value: readonly string[]) => {
      setFilters({ groups: [...value], page: 1 });
    },
    [setFilters],
  );

  const handleOutputFilterChange = useCallback(
    (value: DisplayOutputFilter) => {
      setFilters({ output: value, page: 1 });
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ status: "all", groups: [], output: "all", page: 1 });
  }, [setFilters]);

  return {
    statusFilter: filters.status,
    search: filters.q,
    page: filters.page,
    setPage: (page: number) => setFilters({ page }),
    groupFilters: filters.groups,
    normalizedOutputFilter,
    handleStatusFilterChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
  };
}
