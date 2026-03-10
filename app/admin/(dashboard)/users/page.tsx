"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { UserSearchInput } from "@/components/users/user-search-input";
import { UsersPagination } from "@/components/users/users-pagination";
import { UsersTable } from "@/components/users/users-table";
import { PendingInvitationsTable } from "@/components/users/pending-invitations-table";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  AuthApiError,
  createInvitation,
  type CreateInvitationResponse,
  getInvitations,
  resendInvitation,
} from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useGetUsersQuery,
  useGetRoleOptionsQuery,
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
import type { InvitationRecord } from "@/types/invitation";

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;

export default function UsersPage(): ReactElement {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const canCreateUser = useCan("users:create");
  const canReadRoles = useCan("roles:read");
  const isAdmin = currentUser?.isAdmin === true;
  const pageSize = 10;
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
    pageSize,
    q: search || undefined,
    sortBy: sortField === "lastSeen" ? "lastSeenAt" : "name",
    sortDirection,
  });
  const { data: rolesData } = useGetRoleOptionsQuery(undefined, {
    skip: !canReadRoles,
  });
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
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

  const paginatedUsers = users;

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  if (usersLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-muted-foreground">Loading users…</p>
            </div>
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
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                Failed to load users. Check the API and try again.
              </p>
            </div>
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
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <h2 className="text-base font-semibold">Search Results</h2>
            <UserSearchInput
              value={search}
              onChange={handleSearchChange}
              className="w-full max-w-none md:w-72"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            <div className="overflow-hidden rounded-md border border-border">
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
                isSuperAdmin={isAdmin}
                systemRoleIds={systemRoleIds}
                currentUserId={currentUser?.id}
              />
            </div>

            <Can permission="users:create">
              <section className="mt-6 overflow-hidden rounded-md border border-border">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Invitations</h3>
                  <p className="text-xs text-muted-foreground">
                    Recent invitation status and expiration timestamps.
                  </p>
                </div>
                <PendingInvitationsTable
                  invitations={invitations}
                  isLoading={isInvitationsLoading}
                  resendingInvitationId={resendingInvitationId}
                  onResend={handleResendInvitation}
                />
              </section>
            </Can>
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <UsersPagination
            page={page}
            pageSize={pageSize}
            total={usersData?.total ?? 0}
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
        errorFallback="Failed to remove user"
        onConfirm={async () => {
          if (!userToRemove) return;
          await deleteUser(userToRemove.id).unwrap();
          setUserToRemove(null);
        }}
      />
    </DashboardPage.Root>
  );
}
