"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { UserSearchInput } from "@/components/users/user-search-input";
import { UsersPagination } from "@/components/users/users-pagination";
import { UsersTable } from "@/components/users/users-table";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  AuthApiError,
  createInvitation,
  type CreateInvitationResponse,
} from "@/lib/api-client";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useLazyGetUserRolesQuery,
  useGetUsersQuery,
  useGetRolesQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useSetUserRolesMutation,
} from "@/lib/api/rbac-api";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import type {
  User,
  UserRole,
  UserSort,
  UserSortDirection,
  UserSortField,
} from "@/types/user";

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
const HIGH_RISK_TARGET_THRESHOLD = 20;

export default function UsersPage(): ReactElement {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const isSuperAdmin = useCan("*:manage");
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

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

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [userRolesByUserId, setUserRolesByUserId] = useState<
    Readonly<Record<string, readonly UserRole[]>>
  >({});

  const pageSize = 10;

  const sort = useMemo<UserSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

  const users: User[] = useMemo(
    () =>
      (usersData ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        lastSeenAt: user.lastSeenAt ?? null,
        avatarUrl: user.avatarUrl ?? null,
      })),
    [usersData],
  );
  const availableRoles = useMemo(() => {
    const roles = rolesData ?? [];
    const filtered = isSuperAdmin
      ? roles
      : roles.filter((role) => !role.isSystem);
    return filtered.map((role) => ({ id: role.id, name: role.name }));
  }, [rolesData, isSuperAdmin]);

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
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        toast.error("Too many invite requests. Please wait and try again.");
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to invite user(s)",
      );
    }
  }, []);

  const systemRoleIds = useMemo(
    () => (rolesData ?? []).filter((r) => r.isSystem).map((r) => r.id),
    [rolesData],
  );

  const handleRoleToggle = useCallback(
    async (userId: string, newRoleIds: string[]) => {
      try {
        const roleIdsToSend = isSuperAdmin
          ? newRoleIds
          : (() => {
              const currentIds =
                userRolesByUserId[userId]?.map((r) => r.id) ?? [];
              const preservedSystem = currentIds.filter((id) =>
                systemRoleIds.includes(id),
              );
              return [...new Set([...newRoleIds, ...preservedSystem])];
            })();
        let policyVersion: number | undefined;
        if (roleIdsToSend.length > HIGH_RISK_TARGET_THRESHOLD) {
          const confirmed = window.confirm(
            "This updates a high number of roles. Continue with a governed bulk change?",
          );
          if (!confirmed) {
            return;
          }
          const policyVersionInput = window.prompt(
            "Enter policy version for this high-impact role update:",
          );
          if (!policyVersionInput) {
            toast.error(
              "Policy version is required for high-impact role updates.",
            );
            return;
          }
          const parsedPolicyVersion = Number.parseInt(policyVersionInput, 10);
          if (
            !Number.isInteger(parsedPolicyVersion) ||
            parsedPolicyVersion < 1
          ) {
            toast.error("Policy version must be a positive whole number.");
            return;
          }
          policyVersion = parsedPolicyVersion;
        }
        const roles = await setUserRoles({
          userId,
          roleIds: roleIdsToSend,
          policyVersion,
        }).unwrap();
        setUserRolesByUserId((prev) => ({
          ...prev,
          [userId]: roles.map((r) => ({ id: r.id, name: r.name })),
        }));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update user roles",
        );
      }
    },
    [setUserRoles, isSuperAdmin, userRolesByUserId, systemRoleIds],
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
          name: data.name,
          email: data.email,
          isActive: data.isActive,
        }).unwrap();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update user",
        );
      }
    },
    [updateUser],
  );

  const handleRequestRemoveUser = useCallback((user: User) => {
    setUserToRemove(user);
    setIsRemoveDialogOpen(true);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "lastSeen":
          const aDate = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
          const bDate = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
          return (aDate - bDate) * direction;
        default:
          return 0;
      }
    });
  }, [filteredUsers, sort]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page]);

  useEffect(() => {
    let cancelled = false;
    if (paginatedUsers.length === 0) return () => undefined;

    async function loadVisibleUserRoles(): Promise<void> {
      const entries = await Promise.all(
        paginatedUsers.map(async (user) => {
          try {
            const roles = await getUserRolesTrigger(user.id, true).unwrap();
            return [
              user.id,
              roles.map((role) => ({ id: role.id, name: role.name })),
            ] as const;
          } catch {
            return [user.id, []] as const;
          }
        }),
      );

      if (cancelled) return;
      setUserRolesByUserId((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    }

    void loadVisibleUserRoles();

    return () => {
      cancelled = true;
    };
  }, [getUserRolesTrigger, paginatedUsers]);

  if (usersLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading users…</p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  if (usersError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-destructive">
              Failed to load users. Check the API and try again.
            </p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Users"
        actions={
          <Can permission="users:create">
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <IconPlus className="size-4" />
              Invite User
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <h2 className="text-base font-semibold">Search Results</h2>
          <UserSearchInput
            value={search}
            onChange={handleSearchChange}
            className="w-full max-w-none md:w-72"
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <div className="overflow-hidden rounded-lg border">
            <UsersTable
              users={paginatedUsers}
              availableRoles={availableRoles}
              userRolesByUserId={userRolesByUserId}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onRoleToggle={handleRoleToggle}
              onRemoveUser={handleRequestRemoveUser}
              canUpdate={canUpdateUser}
              canDelete={canDeleteUser}
              isSuperAdmin={isSuperAdmin}
              systemRoleIds={systemRoleIds}
              currentUserId={currentUser?.id}
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <UsersPagination
            page={page}
            pageSize={pageSize}
            total={sortedUsers.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <InviteUsersDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInvite={handleInvite}
      />

      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
      />

      <ConfirmActionDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        title="Remove user?"
        description={
          userToRemove
            ? `This will permanently remove "${userToRemove.name}".`
            : undefined
        }
        confirmLabel="Remove user"
        onConfirm={async () => {
          if (!userToRemove) return;
          try {
            await deleteUser(userToRemove.id).unwrap();
            setUserToRemove(null);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to remove user",
            );
            throw err;
          }
        }}
      />
    </DashboardPage.Root>
  );
}
