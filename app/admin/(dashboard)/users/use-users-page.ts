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
} from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useGetUsersQuery,
  useGetRoleOptionsQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
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
  userToRemove: User | null;
  isRemoveDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setIsInviteDialogOpen: (open: boolean) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setIsRemoveDialogOpen: (open: boolean) => void;
  setUserToRemove: (user: User | null) => void;

  // Handlers
  handleSearchChange: (value: string) => void;
  handleSortChange: (nextSort: UserSort) => void;
  handleInvite: (emails: readonly string[]) => Promise<void>;
  handleResendInvitation: (id: string) => Promise<void>;
  handleRoleToggle: (userId: string, newRoleIds: string[]) => void;
  handleEdit: (user: User) => void;
  handleEditSubmit: (data: EditUserFormData) => Promise<void>;
  handleRequestRemoveUser: (user: User) => void;
  deleteUser: (id: string) => Promise<void>;
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
  const [deleteUserMutation] = useDeleteUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(false);
  const [invitations, setInvitations] = useState<readonly InvitationRecord[]>(
    [],
  );
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);

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

  const handleInvite = useCallback(async (emails: readonly string[]) => {
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
        (result): result is PromiseFulfilledResult<CreateInvitationResponse> =>
          result.status === "fulfilled",
      );
      if (firstSuccess?.value.inviteUrl) {
        toast.success(
          "Invitations created. Dev invite URL available in response.",
        );
      } else {
        toast.success("Invitations created successfully.");
      }

      setIsInviteDialogOpen(false);
      const latestInvitations = await getInvitations();
      setInvitations(latestInvitations);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        notifyApiError(
          err,
          "Too many invite requests. Please wait and try again.",
        );
        return;
      }
      notifyApiError(err, "Failed to invite user(s)");
    }
  }, []);

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
      const result = await resendInvitation(id);
      if (result.inviteUrl) {
        toast.success(
          "Invitation resent. Dev invite URL available in response.",
        );
      } else {
        toast.success("Invitation resent.");
      }
      const latestInvitations = await getInvitations();
      setInvitations(latestInvitations);
    } catch (err) {
      notifyApiError(err, "Failed to resend invite");
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

  const handleRequestRemoveUser = useCallback((user: User) => {
    setUserToRemove(user);
    setIsRemoveDialogOpen(true);
  }, []);

  const deleteUser = useCallback(
    async (id: string) => {
      await deleteUserMutation(id).unwrap();
    },
    [deleteUserMutation],
  );

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
    userToRemove,
    isRemoveDialogOpen,
    setPage,
    setIsInviteDialogOpen,
    setIsEditDialogOpen,
    setIsRemoveDialogOpen,
    setUserToRemove,
    handleSearchChange,
    handleSortChange,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEdit,
    handleEditSubmit,
    handleRequestRemoveUser,
    deleteUser,
  };
}
