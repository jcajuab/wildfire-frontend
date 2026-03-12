"use client";

import { useCallback, useMemo } from "react";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { RoleSort, RoleSortDirection, RoleSortField } from "@/types/role";

const ROLE_SORT_FIELDS = ["name", "usersCount"] as const;
const ROLE_SORT_DIRECTIONS = ["asc", "desc"] as const;

export function useRolesFilters() {
  const [search, setSearch] = useQueryStringState("q", "");
  const [sortField, setSortField] = useQueryEnumState<RoleSortField>(
    "sortField",
    "name",
    ROLE_SORT_FIELDS,
  );
  const [sortDirection, setSortDirection] =
    useQueryEnumState<RoleSortDirection>(
      "sortDir",
      "asc",
      ROLE_SORT_DIRECTIONS,
    );
  const [page, setPage] = useQueryNumberState("page", 1);

  const sort = useMemo<RoleSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
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
    sortField,
    sortDirection,
    handleSearchChange,
    handleSortChange,
  };
}
