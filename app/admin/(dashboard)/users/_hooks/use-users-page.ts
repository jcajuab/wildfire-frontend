"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  rbacApi,
  useGetUsersQuery,
  useGetRoleOptionsQuery,
} from "@/lib/api/rbac-api";
import type {
  RbacRoleSummary,
  RbacUserListQuery,
  RbacUsersListResponse,
} from "@/lib/api/rbac-api";
import type { User, UserRole, UserSort } from "@/types/user";
import type {
  InvitationListResponse,
  InvitationRecord,
  InvitationSort,
  InvitationStatusFilter,
} from "@/types/invitation";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import { useUsersFilters, type UsersPageTab } from "./use-users-filters";
import { useUsersDialogs } from "./use-users-dialogs";
import { USERS_PAGE_SIZE } from "@/lib/users-search-params";

import { useUsersHandlers } from "./use-users-handlers";

export const PAGE_SIZE = USERS_PAGE_SIZE;

function normalizedUsersQueryKey(query: RbacUserListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    q: query.q ?? null,
    roleId: query.roleId ?? null,
    sortBy: query.sortBy ?? "name",
    sortDirection: query.sortDirection ?? "asc",
  });
}

function normalizedInvitationQueryKey(query: {
  readonly page?: number;
  readonly pageSize?: number;
  readonly q?: string;
  readonly status?: InvitationStatusFilter;
  readonly sortBy?: InvitationSort["field"];
  readonly sortDirection?: InvitationSort["direction"];
}): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    q: query.q ?? null,
    status: query.status === "all" ? null : (query.status ?? null),
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
  });
}

export interface UseUsersPageResult {
  // Auth
  currentUser:
    | { id: string; name?: string; isAdmin?: boolean }
    | null
    | undefined;
  isAdmin: boolean;

  // Permissions
  canUpdateUser: boolean;
  canDeleteUser: boolean;
  canCreateUser: boolean;

  // Filter state
  search: string;
  roleId: string;
  page: number;
  invitationSearch: string;
  invitationPage: number;
  invitationStatusFilter: InvitationStatusFilter;
  activeTab: UsersPageTab;
  sort: UserSort;
  invitationSort: InvitationSort;

  // Query data
  users: User[];
  usersData: RbacUsersListResponse | undefined;
  availableRoles: readonly { id: string; name: string }[];
  userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  systemRoleIds: readonly string[];
  usersLoading: boolean;
  usersFetching: boolean;
  usersError: boolean;
  isRoleToggling: boolean;

  // Invitations
  invitations: readonly InvitationRecord[];
  invitationsData: InvitationListResponse | undefined;
  isInvitationsLoading: boolean;
  resendingInvitationId: string | null;

  // Dialog state
  isInviteDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedUser: User | null;
  userToBan: User | null;
  isBanDialogOpen: boolean;

  // Reset password dialog
  resetPasswordResult: { userId: string; password: string } | null;
  isResetPasswordDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setInvitationPage: (page: number) => void;
  setActiveTab: (tab: UsersPageTab) => void;
  setIsInviteDialogOpen: (open: boolean) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setIsBanDialogOpen: (open: boolean) => void;
  setUserToBan: (user: User | null) => void;
  setIsResetPasswordDialogOpen: (open: boolean) => void;

  // Handlers
  handleSearchChange: (value: string) => void;
  handleInvitationSearchChange: (value: string) => void;
  handleSortChange: (nextSort: UserSort) => void;
  handleRoleFilterChange: (roleId: string) => void;
  handleInvitationStatusFilterChange: (status: InvitationStatusFilter) => void;
  handleInvitationSortChange: (nextSort: InvitationSort) => void;
  handleInvite: (
    emails: readonly string[],
  ) => Promise<{ id: string; expiresAt: string } | null>;
  handleResendInvitation: (id: string) => Promise<void>;
  handleRoleToggle: (userId: string, newRoleIds: string[]) => Promise<string[]>;
  handleEdit: (user: User) => void;
  handleEditSubmit: (data: EditUserFormData) => Promise<void>;
  handleRequestBanUser: (user: User) => void;
  handleRequestUnbanUser: (user: User) => void;
  handleResetPassword: (userId: string) => Promise<void>;
  banUserById: (id: string) => Promise<void>;
  unbanUserById: (id: string) => Promise<void>;
  refreshUsers: () => void;
}

export function useUsersPage(options?: {
  initialUsers?: {
    readonly queryArgs: RbacUserListQuery;
    readonly data: RbacUsersListResponse;
  };
  initialRoles?: readonly RbacRoleSummary[];
  initialInvitations?: InvitationListResponse;
}): UseUsersPageResult {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const canCreateUser = useCan("users:create");
  const canReadRoles = useCan("roles:read");
  const isAdmin = currentUser?.isAdmin === true;

  const filters = useUsersFilters();
  const debouncedSearch = useDebounce(filters.search, 500);
  const debouncedInvitationSearch = useDebounce(filters.invitationSearch, 500);

  const usersQueryArgs: RbacUserListQuery = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    q: debouncedSearch || undefined,
    roleId: filters.roleId === "all" ? undefined : filters.roleId,
    sortBy: filters.sortField === "lastSeen" ? "lastSeenAt" : filters.sortField,
    sortDirection: filters.sortDirection,
  };
  const isInitialUsersQuery =
    options?.initialUsers != null &&
    normalizedUsersQueryKey(options.initialUsers.queryArgs) ===
      normalizedUsersQueryKey(usersQueryArgs);

  const {
    data: usersData,
    isLoading: usersQueryLoading,
    isFetching: usersQueryFetching,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetUsersQuery(usersQueryArgs, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: isInitialUsersQuery,
  });
  const cachedInitialUsers = rbacApi.endpoints.getUsers.useQueryState(
    usersQueryArgs,
    { skip: !isInitialUsersQuery },
  );
  const effectiveUsersData = isInitialUsersQuery
    ? (cachedInitialUsers.data ?? options?.initialUsers?.data)
    : usersData;

  const { data: rolesData, isLoading: rolesLoading } = useGetRoleOptionsQuery(
    undefined,
    { skip: !canReadRoles, refetchOnFocus: false, refetchOnReconnect: false },
  );
  const effectiveRolesData = rolesData ?? options?.initialRoles;

  const usersLoading =
    effectiveUsersData == null &&
    (isInitialUsersQuery ? false : usersQueryLoading || rolesLoading);

  const dialogs = useUsersDialogs();

  const users: User[] = useMemo(
    () =>
      (effectiveUsersData?.items ?? []).map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isInvitedUser: user.isInvitedUser,
        bannedAt: user.bannedAt,
        lastSeenAt: user.lastSeenAt ?? null,
        avatarUrl: user.avatarUrl ?? null,
        roles: user.roles,
      })),
    [effectiveUsersData?.items],
  );

  const availableRoles = useMemo(() => {
    const roles = effectiveRolesData ?? [];
    const filtered = roles.filter((role) => !role.isSystem);
    return filtered.map((role) => ({ id: role.id, name: role.name }));
  }, [effectiveRolesData]);

  const systemRoleIds = useMemo(
    () =>
      (effectiveRolesData ?? [])
        .filter((role) => role.isSystem)
        .map((role) => role.id),
    [effectiveRolesData],
  );

  const userRolesByUserId = useMemo<
    Readonly<Record<string, readonly UserRole[]>>
  >(
    () =>
      Object.fromEntries(
        users.map((user) => [user.id, user.roles ?? []]),
      ) as Readonly<Record<string, readonly UserRole[]>>,
    [users],
  );

  const invitationQuery = useMemo(
    () => ({
      page: filters.invitationPage,
      pageSize: PAGE_SIZE,
      q: debouncedInvitationSearch || undefined,
      status: filters.invitationStatusFilter,
      sortBy: filters.invitationSort.field,
      sortDirection: filters.invitationSort.direction,
    }),
    [
      filters.invitationPage,
      debouncedInvitationSearch,
      filters.invitationSort.direction,
      filters.invitationSort.field,
      filters.invitationStatusFilter,
    ],
  );
  const invitationQueryKey = useMemo(
    () => normalizedInvitationQueryKey(invitationQuery),
    [invitationQuery],
  );
  const isInitialInvitationsQuery =
    options?.initialInvitations != null &&
    invitationQueryKey ===
      normalizedInvitationQueryKey({
        page: 1,
        pageSize: PAGE_SIZE,
        sortBy: "createdAt",
        sortDirection: "desc",
      });
  const [loadedInvitations, setLoadedInvitations] = useState<
    | {
        readonly queryKey: string;
        readonly data: InvitationListResponse;
      }
    | undefined
  >(undefined);
  const setInvitationsData = useCallback(
    (data: InvitationListResponse | undefined): void => {
      setLoadedInvitations(
        data != null ? { queryKey: invitationQueryKey, data } : undefined,
      );
    },
    [invitationQueryKey],
  );
  const invitationsData = isInitialInvitationsQuery
    ? options?.initialInvitations
    : loadedInvitations?.queryKey === invitationQueryKey
      ? loadedInvitations.data
      : undefined;

  const handlers = useUsersHandlers({
    canCreateUser,
    isAdmin,
    systemRoleIds,
    userRolesByUserId,
    invitationQuery,
    setInvitationsData,
    setIsEditDialogOpen: dialogs.setIsEditDialogOpen,
    setSelectedUser: dialogs.setSelectedUser,
    setResetPasswordResult: dialogs.setResetPasswordResult,
    setIsResetPasswordDialogOpen: dialogs.setIsResetPasswordDialogOpen,
  });

  const { loadInvitations } = handlers;
  useEffect(() => {
    if (!canCreateUser || isInitialInvitationsQuery) return;

    void loadInvitations();
  }, [canCreateUser, isInitialInvitationsQuery, loadInvitations]);

  return {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    canCreateUser,
    search: filters.search,
    roleId: filters.roleId,
    page: filters.page,
    invitationSearch: filters.invitationSearch,
    invitationPage: filters.invitationPage,
    invitationStatusFilter: filters.invitationStatusFilter,
    activeTab: filters.activeTab,
    sort: filters.sort,
    invitationSort: filters.invitationSort,
    users,
    usersData: effectiveUsersData,
    availableRoles,
    userRolesByUserId,
    systemRoleIds,
    usersLoading,
    usersFetching: usersQueryFetching,
    usersError,
    isRoleToggling: handlers.isRoleToggling,
    invitations: invitationsData?.items ?? [],
    invitationsData,
    isInvitationsLoading: handlers.isInvitationsLoading,
    resendingInvitationId: handlers.resendingInvitationId,
    isInviteDialogOpen: dialogs.isInviteDialogOpen,
    isEditDialogOpen: dialogs.isEditDialogOpen,
    selectedUser: dialogs.selectedUser,
    userToBan: dialogs.userToBan,
    isBanDialogOpen: dialogs.isBanDialogOpen,
    resetPasswordResult: dialogs.resetPasswordResult,
    isResetPasswordDialogOpen: dialogs.isResetPasswordDialogOpen,
    setPage: filters.setPage,
    setInvitationPage: filters.setInvitationPage,
    setActiveTab: filters.setActiveTab,
    setIsInviteDialogOpen: dialogs.setIsInviteDialogOpen,
    setIsEditDialogOpen: dialogs.setIsEditDialogOpen,
    setIsBanDialogOpen: dialogs.setIsBanDialogOpen,
    setUserToBan: dialogs.setUserToBan,
    setIsResetPasswordDialogOpen: dialogs.setIsResetPasswordDialogOpen,
    handleSearchChange: filters.handleSearchChange,
    handleInvitationSearchChange: filters.handleInvitationSearchChange,
    handleSortChange: filters.handleSortChange,
    handleRoleFilterChange: filters.handleRoleFilterChange,
    handleInvitationStatusFilterChange:
      filters.handleInvitationStatusFilterChange,
    handleInvitationSortChange: filters.handleInvitationSortChange,
    handleInvite: handlers.handleInvite,
    handleResendInvitation: handlers.handleResendInvitation,
    handleRoleToggle: handlers.handleRoleToggle,
    handleEdit: dialogs.handleEdit,
    handleEditSubmit: handlers.handleEditSubmit,
    handleRequestBanUser: dialogs.handleRequestBanUser,
    handleRequestUnbanUser: dialogs.handleRequestUnbanUser,
    handleResetPassword: handlers.handleResetPassword,
    banUserById: handlers.banUserById,
    unbanUserById: handlers.unbanUserById,
    refreshUsers: refetchUsers,
  };
}
