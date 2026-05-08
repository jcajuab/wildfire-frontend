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

  const setPage = useCallback(
    (value: number) => setFilters({ page: value }),
    [setFilters],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters({ q: value, page: 1 });
    },
    [setFilters],
  );

  const handleSortChange = useCallback(
    (nextSort: RoleSort) => {
      setFilters({
        sortField: nextSort.field,
        sortDir: nextSort.direction,
        page: 1,
      });
    },
    [setFilters],
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
