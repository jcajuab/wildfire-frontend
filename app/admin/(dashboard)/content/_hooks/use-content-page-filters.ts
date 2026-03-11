"use client";

import { useCallback } from "react";
import type {
  ContentStatusFilter,
  TypeFilter,
} from "@/components/content/content-filter-popover";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = [
  "all",
  "IMAGE",
  "VIDEO",
  "PDF",
  "FLASH",
  "TEXT",
] as const;

export function useContentPageFilters() {
  const [statusFilter, setStatusFilter] = useQueryEnumState<ContentStatusFilter>(
    "status",
    "all",
    CONTENT_STATUS_VALUES,
  );
  const [typeFilter, setTypeFilter] = useQueryEnumState<TypeFilter>(
    "type",
    "all",
    CONTENT_TYPE_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const handleStatusFilterChange = useCallback(
    (value: ContentStatusFilter) => {
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setPage, setSearch],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  }, [setPage, setStatusFilter, setTypeFilter]);

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
