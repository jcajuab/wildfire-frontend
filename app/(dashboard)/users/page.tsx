"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  UsersTable,
  UserSearchInput,
  UsersPagination,
  InviteUsersDialog,
} from "@/components/users";
import { useApp } from "@/context/app-context";
import type { User, UserRole, UserSort } from "@/types/user";

export default function UsersPage(): React.ReactElement {
  // Context
  const { users, roles, addUser, updateUser, removeUser } = useApp();

  // State
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UserSort>({
    field: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Pagination
  const pageSize = 10;

  // Handlers
  const handleInvite = useCallback(
    (emails: readonly string[]) => {
      // Create pending users from emails
      emails.forEach((email) => {
        const newUser: User = {
          id: crypto.randomUUID(),
          name: email.split("@")[0] ?? "User",
          email,
          roles: [],
          lastSeenAt: null,
        };
        addUser(newUser);
      });
    },
    [addUser],
  );

  const handleRoleToggle = useCallback(
    (userId: string, roleId: string, checked: boolean) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const role = roles.find((r) => r.id === roleId);
      if (!role) return;

      let newRoles = user.roles;
      if (checked) {
        // Check if already has role
        if (!newRoles.some((r) => r.id === roleId)) {
          newRoles = [...newRoles, { id: role.id, name: role.name }];
        }
      } else {
        newRoles = newRoles.filter((r) => r.id !== roleId);
      }

      updateUser({ ...user, roles: newRoles });
    },
    [users, roles, updateUser],
  );

  const handleRemoveUser = useCallback(
    (user: User) => {
      removeUser(user.id);
    },
    [removeUser],
  );

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  // Sort users
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

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Users">
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <IconPlus className="size-4" />
          Invite User
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <UserSearchInput value={search} onChange={setSearch} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          <div className="overflow-hidden rounded-lg border">
            <UsersTable
              users={paginatedUsers}
              availableRoles={roles}
              sort={sort}
              onSortChange={setSort}
              onRoleToggle={handleRoleToggle}
              onRemoveUser={handleRemoveUser}
            />
          </div>
        </div>

        {/* Pagination */}
        <UsersPagination
          page={page}
          pageSize={pageSize}
          total={sortedUsers.length}
          onPageChange={setPage}
        />
      </div>

      {/* Invite Users Dialog */}
      <InviteUsersDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInvite={handleInvite}
      />
    </div>
  );
}
