"use client";

import { useCallback } from "react";
import type { TypeFilter } from "@/components/content/content-filter-popover";
import type { StatusFilter } from "@/components/content/content-status-tabs";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { ContentSortField } from "@/types/content";

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "PDF", "FLASH"] as const;
const CONTENT_SORT_VALUES = ["createdAt", "title", "fileSize", "type"] as const;

export function useContentPageFilters() {
  const [statusFilter, setStatusFilter] = useQueryEnumState<StatusFilter>(
    "status",
    "all",
    CONTENT_STATUS_VALUES,
  );
  const [typeFilter, setTypeFilter] = useQueryEnumState<TypeFilter>(
    "type",
    "all",
    CONTENT_TYPE_VALUES,
  );
  const [sortBy, setSortBy] = useQueryEnumState<ContentSortField>(
    "sort",
    "createdAt",
    CONTENT_SORT_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const handleStatusFilterChange = useCallback(
    (value: StatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setPage, setStatusFilter],
  );

  const handleTypeFilterChange = useCallback(
    (value: TypeFilter) => {
      setTypeFilter(value);
      setPage(1);
    },
    [setPage, setTypeFilter],
  );

  const handleSortChange = useCallback(
    (value: ContentSortField) => {
      setSortBy(value);
      setPage(1);
    },
    [setPage, setSortBy],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setPage, setSearch],
  );

  return {
    statusFilter,
    typeFilter,
    sortBy,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleTypeFilterChange,
    handleSortChange,
    handleSearchChange,
  };
}
