"use client";

import { useCallback, useMemo } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import type { SortDirection } from "@/types/common";
import type { UserSort, UserSortField, UserTypeFilter } from "@/types/user";
import type {
  InvitationSort,
  InvitationSortField,
  InvitationStatusFilter,
} from "@/types/invitation";

const USER_SORT_FIELDS = ["name", "email", "lastSeen"] as const;
const INVITATION_SORT_FIELDS = ["createdAt", "email", "expiresAt"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
const USER_TABS = ["users", "invitations"] as const;
const USER_TYPE_FILTERS = ["all", "dcism", "invited", "banned"] as const;
const INVITATION_STATUS_FILTERS = [
  "all",
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;

export type UsersPageTab = (typeof USER_TABS)[number];

const usersFiltersSchema = {
  q: parseAsString.withDefault(""),
  roleId: parseAsString.withDefault("all"),
  userType: parseAsStringLiteral(USER_TYPE_FILTERS).withDefault("all"),
  sortField: parseAsStringLiteral(USER_SORT_FIELDS).withDefault("name"),
  sortDir: parseAsStringLiteral(USER_SORT_DIRECTIONS).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
  tab: parseAsStringLiteral(USER_TABS).withDefault("users"),
  inviteQ: parseAsString.withDefault(""),
  invitePage: parseAsInteger.withDefault(1),
  inviteStatus: parseAsStringLiteral(INVITATION_STATUS_FILTERS).withDefault(
    "all",
  ),
  inviteSortField: parseAsStringLiteral(INVITATION_SORT_FIELDS).withDefault(
    "createdAt",
  ),
  inviteSortDir: parseAsStringLiteral(USER_SORT_DIRECTIONS).withDefault("desc"),
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
  const invitationSort = useMemo<InvitationSort>(
    () => ({
      field: filters.inviteSortField as InvitationSortField,
      direction: filters.inviteSortDir as SortDirection,
    }),
    [filters.inviteSortDir, filters.inviteSortField],
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

  const handleRoleFilterChange = useCallback(
    (roleId: string) => {
      setFilters({ roleId, page: 1 });
    },
    [setFilters],
  );

  const handleUserTypeFilterChange = useCallback(
    (userType: UserTypeFilter) => {
      setFilters({ userType, page: 1 });
    },
    [setFilters],
  );

  const handleInvitationStatusFilterChange = useCallback(
    (status: InvitationStatusFilter) => {
      setFilters({ inviteStatus: status, invitePage: 1 });
    },
    [setFilters],
  );

  const handleInvitationSearchChange = useCallback(
    (value: string) => {
      setFilters({ inviteQ: value, invitePage: 1 });
    },
    [setFilters],
  );

  const handleInvitationSortChange = useCallback(
    (nextSort: InvitationSort) => {
      setFilters({
        inviteSortField: nextSort.field,
        inviteSortDir: nextSort.direction,
        invitePage: 1,
      });
    },
    [setFilters],
  );
  const setPage = useCallback(
    (page: number) => setFilters({ page }),
    [setFilters],
  );
  const setInvitationPage = useCallback(
    (page: number) => setFilters({ invitePage: page }),
    [setFilters],
  );
  const setActiveTab = useCallback(
    (tab: UsersPageTab) => setFilters({ tab }),
    [setFilters],
  );

  return {
    search: filters.q,
    roleId: filters.roleId,
    userType: filters.userType as UserTypeFilter,
    page: filters.page,
    invitationSearch: filters.inviteQ,
    invitationPage: filters.invitePage,
    invitationStatusFilter: filters.inviteStatus as InvitationStatusFilter,
    activeTab: filters.tab,
    setPage,
    setInvitationPage,
    setActiveTab,
    sort,
    invitationSort,
    sortField: filters.sortField,
    sortDirection: filters.sortDir,
    handleSearchChange,
    handleSortChange,
    handleRoleFilterChange,
    handleUserTypeFilterChange,
    handleInvitationSearchChange,
    handleInvitationStatusFilterChange,
    handleInvitationSortChange,
  };
}
