"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { UserSearchInput } from "@/components/users/user-search-input";
import { UsersPagination } from "@/components/users/users-pagination";
import { UsersTable } from "@/components/users/users-table";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import {
  useLazyGetUserRolesQuery,
  useGetUsersQuery,
  useGetRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useSetUserRolesMutation,
} from "@/lib/api/rbac-api";
import type { User, UserRole, UserSort } from "@/types/user";

export default function UsersPage(): React.ReactElement {
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UserSort>({
    field: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [userRolesByUserId, setUserRolesByUserId] = useState<
    Readonly<Record<string, readonly UserRole[]>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pageSize = 10;

  const users: User[] = useMemo(
    () =>
      (usersData ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isActive: u.isActive,
      })),
    [usersData],
  );
  const availableRoles = useMemo(
    () => (rolesData ?? []).map((r) => ({ id: r.id, name: r.name })),
    [rolesData],
  );

  const handleInvite = useCallback(
    async (emails: readonly string[]) => {
      setSubmitError(null);
      try {
        const results = await Promise.allSettled(
          emails.map((email) =>
            createUser({
              email,
              name: email.split("@")[0] ?? "User",
              isActive: true,
            }).unwrap(),
          ),
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

        setIsInviteDialogOpen(false);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to invite user(s)",
        );
      }
    },
    [createUser],
  );

  const handleRoleToggle = useCallback(
    async (userId: string, roleIds: string[]) => {
      setSubmitError(null);
      try {
        await setUserRoles({ userId, roleIds }).unwrap();
        setUserRolesByUserId((prev) => ({
          ...prev,
          [userId]: availableRoles.filter((role) => roleIds.includes(role.id)),
        }));
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to update user roles",
        );
      }
    },
    [setUserRoles, availableRoles],
  );

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setSubmitError(null);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: EditUserFormData) => {
      setSubmitError(null);
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
        setSubmitError(
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
      <div className="flex h-full flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Loading users…</p>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <p className="text-destructive">
          Failed to load users. Check the API and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Users">
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <IconPlus className="size-4" />
          Invite User
        </Button>
      </PageHeader>

      {submitError && (
        <div className="mx-6 mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <UserSearchInput value={search} onChange={setSearch} />
        </div>

        <div className="flex-1 overflow-auto px-6">
          <div className="overflow-hidden rounded-lg border">
            <UsersTable
              users={paginatedUsers}
              availableRoles={availableRoles}
              userRolesByUserId={userRolesByUserId}
              sort={sort}
              onSortChange={setSort}
              onEdit={handleEdit}
              onRoleToggle={handleRoleToggle}
              onRemoveUser={handleRequestRemoveUser}
            />
          </div>
        </div>

        <UsersPagination
          page={page}
          pageSize={pageSize}
          total={sortedUsers.length}
          onPageChange={setPage}
        />
      </div>

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
          setSubmitError(null);
          try {
            await deleteUser(userToRemove.id).unwrap();
            setUserToRemove(null);
          } catch (err) {
            setSubmitError(
              err instanceof Error ? err.message : "Failed to remove user",
            );
            throw err;
          }
        }}
      />
    </div>
  );
}
