"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import { useGetUsersQuery, useGetRoleOptionsQuery } from "@/lib/api/rbac-api";
import type { RbacUsersListResponse } from "@/lib/api/rbac-api";
import type { User, UserRole, UserSort } from "@/types/user";
import type { InvitationRecord } from "@/types/invitation";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import { useUsersFilters } from "./use-users-filters";
import { useUsersDialogs } from "./use-users-dialogs";
import { useUsersHandlers } from "./use-users-handlers";

export const PAGE_SIZE = 10;

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
  page: number;
  sort: UserSort;

  // Query data
  users: User[];
  usersData: RbacUsersListResponse | undefined;
  availableRoles: readonly { id: string; name: string }[];
  userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  systemRoleIds: readonly string[];
  usersLoading: boolean;
  usersError: boolean;

  // Invitations
  invitations: readonly InvitationRecord[];
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
  setIsInviteDialogOpen: (open: boolean) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setIsBanDialogOpen: (open: boolean) => void;
  setUserToBan: (user: User | null) => void;
  setIsResetPasswordDialogOpen: (open: boolean) => void;

  // Handlers
  handleSearchChange: (value: string) => void;
  handleSortChange: (nextSort: UserSort) => void;
  handleInvite: (
    emails: readonly string[],
  ) => Promise<{ id: string; expiresAt: string } | null>;
  handleResendInvitation: (id: string) => Promise<void>;
  handleRoleToggle: (userId: string, newRoleIds: string[]) => void;
  handleEdit: (user: User) => void;
  handleEditSubmit: (data: EditUserFormData) => Promise<void>;
  handleRequestBanUser: (user: User) => void;
  handleRequestUnbanUser: (user: User) => void;
  handleResetPassword: (userId: string) => Promise<void>;
  banUserById: (id: string) => Promise<void>;
  unbanUserById: (id: string) => Promise<void>;
  refreshUsers: () => void;
}

export function useUsersPage(): UseUsersPageResult {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const canCreateUser = useCan("users:create");
  const canReadRoles = useCan("roles:read");
  const isAdmin = currentUser?.isAdmin === true;

  const filters = useUsersFilters();

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetUsersQuery({
    page: filters.page,
    pageSize: PAGE_SIZE,
    q: filters.search || undefined,
    sortBy: filters.sortField === "lastSeen" ? "lastSeenAt" : "name",
    sortDirection: filters.sortDirection,
  });

  const { data: rolesData } = useGetRoleOptionsQuery(undefined, {
    skip: !canReadRoles,
  });

  const [invitations, setInvitations] = useState<readonly InvitationRecord[]>(
    [],
  );

  const dialogs = useUsersDialogs();

  const users: User[] = useMemo(
    () =>
      (usersData?.items ?? []).map((user) => ({
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
    [usersData?.items],
  );

  const availableRoles = useMemo(() => {
    const roles = rolesData ?? [];
    const filtered = isAdmin ? roles : roles.filter((role) => !role.isSystem);
    return filtered.map((role) => ({ id: role.id, name: role.name }));
  }, [rolesData, isAdmin]);

  const systemRoleIds = useMemo(
    () =>
      (rolesData ?? []).filter((role) => role.isSystem).map((role) => role.id),
    [rolesData],
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

  const handlers = useUsersHandlers({
    canCreateUser,
    isAdmin,
    systemRoleIds,
    userRolesByUserId,
    setInvitations,
    setIsEditDialogOpen: dialogs.setIsEditDialogOpen,
    setSelectedUser: dialogs.setSelectedUser,
    setResetPasswordResult: dialogs.setResetPasswordResult,
    setIsResetPasswordDialogOpen: dialogs.setIsResetPasswordDialogOpen,
  });

  const { loadInvitations } = handlers;

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  return {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    canCreateUser,
    search: filters.search,
    page: filters.page,
    sort: filters.sort,
    users,
    usersData,
    availableRoles,
    userRolesByUserId,
    systemRoleIds,
    usersLoading,
    usersError,
    invitations,
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
    setIsInviteDialogOpen: dialogs.setIsInviteDialogOpen,
    setIsEditDialogOpen: dialogs.setIsEditDialogOpen,
    setIsBanDialogOpen: dialogs.setIsBanDialogOpen,
    setUserToBan: dialogs.setUserToBan,
    setIsResetPasswordDialogOpen: dialogs.setIsResetPasswordDialogOpen,
    handleSearchChange: filters.handleSearchChange,
    handleSortChange: filters.handleSortChange,
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
