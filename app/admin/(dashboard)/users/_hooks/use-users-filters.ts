"use client";

import { useCallback, useMemo } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import type { SortDirection } from "@/types/common";
import type { UserSort, UserSortField } from "@/types/user";

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;

const usersFiltersSchema = {
  q: parseAsString.withDefault(""),
  sortField: parseAsStringLiteral(USER_SORT_FIELDS).withDefault("name"),
  sortDir: parseAsStringLiteral(USER_SORT_DIRECTIONS).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
};

export function useUsersFilters() {
  const [filters, setFilters] = useQueryStates(usersFiltersSchema);

  const sort = useMemo<UserSort>(
    () => ({
      field: filters.sortField as UserSortField,
      direction: filters.sortDir as SortDirection,
    }),
    [filters.sortField, filters.sortDir],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
  );

  const handleSortChange = useCallback(
    (nextSort: UserSort) => {
      setFilters({
        sortField: nextSort.field,
        sortDir: nextSort.direction,
        page: 1,
      });
    },
    [setFilters],
  );

  return {
    search: filters.q,
    page: filters.page,
    setPage: (page: number) => setFilters({ page }),
    sort,
    sortField: filters.sortField,
    sortDirection: filters.sortDir,
    handleSearchChange,
    handleSortChange,
  };
}
