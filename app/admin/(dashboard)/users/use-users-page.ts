"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  AuthApiError,
  createInvitation,
  type CreateInvitationResponse,
  getInvitations,
  resendInvitation,
  banUser,
  unbanUser,
  adminResetPassword,
} from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useGetUsersQuery,
  useGetRoleOptionsQuery,
  useUpdateUserMutation,
  useSetUserRolesMutation,
  type RbacUsersListResponse,
} from "@/lib/api/rbac-api";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import type {
  User,
  UserRole,
  UserSort,
  UserSortDirection,
  UserSortField,
} from "@/types/user";
import type { InvitationRecord } from "@/types/invitation";

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
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
  handleInvite: (emails: readonly string[]) => Promise<string | null>;
  handleResendInvitation: (id: string) => Promise<void>;
  handleRoleToggle: (userId: string, newRoleIds: string[]) => void;
  handleEdit: (user: User) => void;
  handleEditSubmit: (data: EditUserFormData) => Promise<void>;
  handleRequestBanUser: (user: User) => void;
  handleRequestUnbanUser: (user: User) => void;

  handleResetPassword: (userId: string) => Promise<void>;
  banUserById: (id: string) => Promise<void>;
  unbanUserById: (id: string) => Promise<void>;
}

export function useUsersPage(): UseUsersPageResult {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const canCreateUser = useCan("users:create");
  const canReadRoles = useCan("roles:read");
  const isAdmin = currentUser?.isAdmin === true;

  const [search, setSearch] = useQueryStringState("q", "");
  const [sortField, setSortField] = useQueryEnumState<UserSortField>(
    "sortField",
    "name",
    USER_SORT_FIELDS,
  );
  const [sortDirection, setSortDirection] =
    useQueryEnumState<UserSortDirection>(
      "sortDir",
      "asc",
      USER_SORT_DIRECTIONS,
    );
  const [page, setPage] = useQueryNumberState("page", 1);

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    q: search || undefined,
    sortBy: sortField === "lastSeen" ? "lastSeenAt" : "name",
    sortDirection,
  });
  const { data: rolesData } = useGetRoleOptionsQuery(undefined, {
    skip: !canReadRoles,
  });
  const [updateUser] = useUpdateUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(false);
  const [invitations, setInvitations] = useState<readonly InvitationRecord[]>(
    [],
  );
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    userId: string;
    password: string;
  } | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);

  const sort = useMemo<UserSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleSortChange = useCallback(
    (nextSort: UserSort) => {
      setSortField(nextSort.field);
      setSortDirection(nextSort.direction);
      setPage(1);
    },
    [setSortField, setSortDirection, setPage],
  );

  const handleInvite = useCallback(
    async (emails: readonly string[]): Promise<string | null> => {
      try {
        const results = await Promise.allSettled(
          emails.map((email) => createInvitation({ email })),
        );

        const failedInvites = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        if (failedInvites.length > 0) {
          const firstError = failedInvites[0]?.reason;
          const details =
            firstError instanceof Error ? `: ${firstError.message}` : "";
          throw new Error(
            `${failedInvites.length} of ${emails.length} invites failed${details}`,
          );
        }

        const firstSuccess = results.find(
          (
            result,
          ): result is PromiseFulfilledResult<CreateInvitationResponse> =>
            result.status === "fulfilled",
        );
        const inviteUrl = firstSuccess?.value.inviteUrl ?? null;

        const latestInvitations = await getInvitations();
        setInvitations(latestInvitations);

        return inviteUrl;
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 429) {
          notifyApiError(
            err,
            "Too many invite requests. Please wait and try again.",
          );
          return null;
        }
        notifyApiError(err, "Failed to invite user(s)");
        return null;
      }
    },
    [],
  );

  const loadInvitations = useCallback(async (): Promise<void> => {
    if (!canCreateUser) {
      setInvitations([]);
      return;
    }

    setIsInvitationsLoading(true);
    try {
      const list = await getInvitations();
      setInvitations(list);
    } catch (err) {
      notifyApiError(err, "Failed to load invitations");
    } finally {
      setIsInvitationsLoading(false);
    }
  }, [canCreateUser]);

  const handleResendInvitation = useCallback(async (id: string) => {
    setResendingInvitationId(id);
    try {
      await resendInvitation(id);
      toast.success("Invitation link regenerated.");
      const latestInvitations = await getInvitations();
      setInvitations(latestInvitations);
    } catch (err) {
      notifyApiError(err, "Failed to regenerate invite link");
    } finally {
      setResendingInvitationId(null);
    }
  }, []);

  const applyUserRoles = useCallback(
    async (payload: { userId: string; roleIds: string[] }): Promise<void> => {
      await setUserRoles(payload).unwrap();
    },
    [setUserRoles],
  );

  const handleRoleToggle = useCallback(
    (userId: string, newRoleIds: string[]) => {
      const roleIdsToSend = isAdmin
        ? newRoleIds
        : (() => {
            const currentIds =
              userRolesByUserId[userId]?.map((r) => r.id) ?? [];
            const preservedSystem = currentIds.filter((id) =>
              systemRoleIds.includes(id),
            );
            return [...new Set([...newRoleIds, ...preservedSystem])];
          })();

      void applyUserRoles({
        userId,
        roleIds: roleIdsToSend,
      }).catch((err) => {
        notifyApiError(err, "Failed to update user roles");
      });
    },
    [applyUserRoles, isAdmin, systemRoleIds, userRolesByUserId],
  );

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: EditUserFormData) => {
      try {
        await updateUser({
          id: data.id,
          username: data.username,
          name: data.name,
          email: data.email,
          isActive: data.isActive,
        }).unwrap();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (err) {
        notifyApiError(err, "Failed to update user");
      }
    },
    [updateUser],
  );

  const handleRequestBanUser = useCallback((user: User) => {
    setUserToBan(user);
    setIsBanDialogOpen(true);
  }, []);

  const handleRequestUnbanUser = useCallback((user: User) => {
    setUserToBan(user);
    setIsBanDialogOpen(true);
  }, []);

  const banUserById = useCallback(async (id: string) => {
    await banUser(id);
  }, []);

  const unbanUserById = useCallback(async (id: string) => {
    await unbanUser(id);
  }, []);

  const handleResetPassword = useCallback(async (userId: string) => {
    try {
      const result = await adminResetPassword(userId);
      setResetPasswordResult({ userId, password: result.password });
      setIsResetPasswordDialogOpen(true);
    } catch (err) {
      notifyApiError(err, "Failed to reset password");
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  return {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    canCreateUser,
    search,
    page,
    sort,
    users,
    usersData,
    availableRoles,
    userRolesByUserId,
    systemRoleIds,
    usersLoading,
    usersError,
    invitations,
    isInvitationsLoading,
    resendingInvitationId,
    isInviteDialogOpen,
    isEditDialogOpen,
    selectedUser,
    userToBan,
    isBanDialogOpen,
    resetPasswordResult,
    isResetPasswordDialogOpen,
    setPage,
    setIsInviteDialogOpen,
    setIsEditDialogOpen,
    setIsBanDialogOpen,
    setUserToBan,
    setIsResetPasswordDialogOpen,
    handleSearchChange,
    handleSortChange,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEdit,
    handleEditSubmit,
    handleRequestBanUser,
    handleRequestUnbanUser,
    handleResetPassword,
    banUserById,
    unbanUserById,
  };
}
