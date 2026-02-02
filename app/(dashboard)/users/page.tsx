"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  EditUserDialog,
  UsersTable,
  UserSearchInput,
  UsersPagination,
  InviteUsersDialog,
} from "@/components/users";
import type { EditUserFormData } from "@/components/users";
import {
  useGetUsersQuery,
  useGetRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/lib/api/rbac-api";
import type { User, UserSort } from "@/types/user";

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

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UserSort>({
    field: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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
        for (const email of emails) {
          await createUser({
            email,
            name: email.split("@")[0] ?? "User",
            isActive: true,
          }).unwrap();
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

  const handleRemoveUser = useCallback(
    async (user: User) => {
      if (!confirm(`Remove user "${user.name}"?`)) return;
      setSubmitError(null);
      try {
        await deleteUser(user.id).unwrap();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to remove user",
        );
      }
    },
    [deleteUser],
  );

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
              sort={sort}
              onSortChange={setSort}
              onEdit={handleEdit}
              onRemoveUser={handleRemoveUser}
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
    </div>
  );
}
