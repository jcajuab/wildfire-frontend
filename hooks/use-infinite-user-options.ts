"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type RbacUser,
  useGetUserOptionsPageQuery,
  useGetUserQuery,
} from "@/lib/api/rbac-api";

interface UseInfiniteUserOptionsOptions {
  readonly enabled?: boolean;
  readonly search?: string;
  readonly pageSize?: number;
  readonly selectedUserId?: string;
}

interface UseInfiniteUserOptionsResult {
  readonly users: readonly RbacUser[];
  readonly isFetching: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
}

function mergeUsers(
  existing: readonly RbacUser[],
  incoming: readonly RbacUser[],
): RbacUser[] {
  const seen = new Set<string>();
  const merged: RbacUser[] = [];
  for (const user of [...existing, ...incoming]) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    merged.push(user);
  }
  return merged;
}

function hasSameUserIds(
  left: readonly RbacUser[],
  right: readonly RbacUser[],
): boolean {
  return (
    left.length === right.length &&
    left.every((user, index) => user.id === right[index]?.id)
  );
}

export function useInfiniteUserOptions({
  enabled = true,
  search = "",
  pageSize = 50,
  selectedUserId,
}: UseInfiniteUserOptionsOptions = {}): UseInfiniteUserOptionsResult {
  const normalizedSearch = search.trim();
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<readonly RbacUser[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset loaded pages when the server-side option query changes.
    setPage(1);
    setUsers([]);
  }, [normalizedSearch, enabled, pageSize]);

  const { data, isFetching } = useGetUserOptionsPageQuery(
    {
      page,
      pageSize,
      q: normalizedSearch.length > 0 ? normalizedSearch : undefined,
    },
    { skip: !enabled },
  );

  useEffect(() => {
    if (!enabled || data == null) return;
    const incomingUsers = Array.isArray(data) ? data : data.items;
    const incomingPage = Array.isArray(data) ? page : data.page;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Accumulate paginated RTK Query results for infinite scrolling.
    setUsers((currentUsers) => {
      const nextUsers =
        incomingPage <= 1
          ? incomingUsers
          : mergeUsers(currentUsers, incomingUsers);
      return hasSameUserIds(currentUsers, nextUsers) ? currentUsers : nextUsers;
    });
  }, [data, enabled, page]);

  const selectedUserInOptions = users.some(
    (user) => user.id === selectedUserId,
  );
  const { data: selectedUser } = useGetUserQuery(selectedUserId ?? "", {
    skip: !enabled || selectedUserId == null || selectedUserInOptions,
  });

  const mergedUsers = useMemo(() => {
    if (selectedUser == null || selectedUserInOptions) {
      return users;
    }
    return mergeUsers([selectedUser], users);
  }, [selectedUser, selectedUserInOptions, users]);

  const hasMore =
    data != null && !Array.isArray(data)
      ? data.page * data.pageSize < data.total
      : false;
  const currentDataUsers =
    data == null ? [] : Array.isArray(data) ? data : data.items;
  const visibleUsers =
    page <= 1 && currentDataUsers.length > 0 ? currentDataUsers : users;
  const loadMore = useCallback(() => {
    if (!enabled || isFetching || !hasMore) return;
    setPage((currentPage) => currentPage + 1);
  }, [enabled, hasMore, isFetching]);

  return {
    users:
      visibleUsers === users ? mergedUsers : mergeUsers(visibleUsers, users),
    isFetching,
    isLoadingMore: isFetching && page > 1,
    hasMore,
    loadMore,
  };
}
