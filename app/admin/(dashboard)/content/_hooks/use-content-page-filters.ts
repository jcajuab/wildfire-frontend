"use client";

import { useCallback } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
  debounce,
} from "nuqs";
import type {
  ContentStatusFilter,
  TypeFilter,
} from "@/components/content/content-filter-popover";

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "FLASH", "TEXT"] as const;

export function useContentPageFilters() {
  const [filters, setFilters] = useQueryStates({
    q: parseAsString
      .withDefault("")
      .withOptions({ limitUrlUpdates: debounce(500) }),
    status: parseAsStringLiteral(CONTENT_STATUS_VALUES).withDefault("all"),
    type: parseAsStringLiteral(CONTENT_TYPE_VALUES).withDefault("all"),
    page: parseAsInteger.withDefault(1),
  });

  const search = filters.q;
  const statusFilter = filters.status as ContentStatusFilter;
  const typeFilter = filters.type as TypeFilter;
  const page = filters.page;

  const setPage = useCallback(
    (p: number) => setFilters({ page: p }),
    [setFilters],
  );

  const handleStatusFilterChange = useCallback(
    (value: ContentStatusFilter) => {
      setFilters({ status: value, page: 1 });
    },
    [setFilters],
  );

  const handleTypeFilterChange = useCallback(
    (value: TypeFilter) => {
      setFilters({ type: value, page: 1 });
    },
    [setFilters],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ status: "all", type: "all", page: 1 });
  }, [setFilters]);

  return {
    statusFilter,
    typeFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleTypeFilterChange,
    handleSearchChange,
    handleClearFilters,
  };
}
