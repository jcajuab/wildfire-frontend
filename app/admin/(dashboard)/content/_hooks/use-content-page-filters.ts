"use client";

import { useCallback } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import type {
  ContentSortFilter,
  ContentStatusFilter,
  TypeFilter,
} from "@/components/content/content-filter-popover";

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "FLASH", "TEXT"] as const;
const CONTENT_SORT_VALUES = [
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
  "file-size-desc",
  "file-size-asc",
] as const;

export function useContentPageFilters() {
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsStringLiteral(CONTENT_STATUS_VALUES).withDefault("all"),
    type: parseAsStringLiteral(CONTENT_TYPE_VALUES).withDefault("all"),
    ownerId: parseAsString.withDefault("all"),
    sort: parseAsStringLiteral(CONTENT_SORT_VALUES).withDefault("newest"),
    page: parseAsInteger.withDefault(1),
  });

  const search = filters.q;
  const statusFilter = filters.status as ContentStatusFilter;
  const typeFilter = filters.type as TypeFilter;
  const ownerFilter = filters.ownerId;
  const sortFilter = filters.sort as ContentSortFilter;
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

  const handleOwnerFilterChange = useCallback(
    (value: string) => {
      setFilters({ ownerId: value, page: 1 });
    },
    [setFilters],
  );

  const handleSortFilterChange = useCallback(
    (value: ContentSortFilter) => {
      setFilters({ sort: value, page: 1 });
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
    setFilters({
      status: "all",
      type: "all",
      ownerId: "all",
      sort: "newest",
      page: 1,
    });
  }, [setFilters]);

  return {
    statusFilter,
    typeFilter,
    ownerFilter,
    sortFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleTypeFilterChange,
    handleOwnerFilterChange,
    handleSortFilterChange,
    handleSearchChange,
    handleClearFilters,
  };
}
