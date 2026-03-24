"use client";

import { useCallback, useMemo } from "react";
import {
  parseAsInteger,
  parseAsStringLiteral,
  useQueryStates,
  debounce,
  parseAsString,
} from "nuqs";
import type { SortDirection } from "@/types/common";
import type { RoleSort, RoleSortField } from "@/types/role";

const ROLE_SORT_FIELDS = ["name", "usersCount"] as const;
const ROLE_SORT_DIRECTIONS = ["asc", "desc"] as const;

const rolesFiltersParsers = {
  q: parseAsString
    .withDefault("")
    .withOptions({ limitUrlUpdates: debounce(500) }),
  sortField: parseAsStringLiteral(ROLE_SORT_FIELDS).withDefault("name"),
  sortDir: parseAsStringLiteral(ROLE_SORT_DIRECTIONS).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
};

export function useRolesFilters() {
  const [filters, setFilters] = useQueryStates(rolesFiltersParsers);

  const { q: search, sortField, sortDir: sortDirection, page } = filters;

  const sort = useMemo<RoleSort>(
    () => ({
      field: sortField as RoleSortField,
      direction: sortDirection as SortDirection,
    }),
    [sortField, sortDirection],
  );

  const setSearch = useCallback(
    (value: string) => setFilters({ q: value }),
    [setFilters],
  );

  const setPage = useCallback(
    (value: number) => setFilters({ page: value }),
    [setFilters],
  );

  const setSortField = useCallback(
    (value: RoleSortField) => setFilters({ sortField: value }),
    [setFilters],
  );

  const setSortDirection = useCallback(
    (value: SortDirection) => setFilters({ sortDir: value }),
    [setFilters],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleSortChange = useCallback(
    (nextSort: RoleSort) => {
      setSortField(nextSort.field);
      setSortDirection(nextSort.direction);
      setPage(1);
    },
    [setSortField, setSortDirection, setPage],
  );

  return {
    search,
    page,
    setPage,
    sort,
    sortField: sortField as RoleSortField,
    sortDirection: sortDirection as SortDirection,
    handleSearchChange,
    handleSortChange,
  };
}
