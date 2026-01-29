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
import type { User, UserRole, UserSort } from "@/types/user";

// Mock roles - will be replaced with API data
const mockRoles: UserRole[] = [
  { id: "1", name: "Admin" },
  { id: "2", name: "Editor" },
  { id: "3", name: "Viewer" },
];

// Mock users - will be replaced with API data
const mockUsers: User[] = [
  {
    id: "1",
    name: "Admin",
    email: "john.doe@example.com",
    roles: [{ id: "1", name: "Admin" }],
    lastSeenAt: "2023-04-15T08:43:31Z",
  },
];

export default function UsersPage(): React.ReactElement {
  // State
  const [users, setUsers] = useState<User[]>(mockUsers);
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
  const handleInvite = useCallback((emails: readonly string[]) => {
    // Create pending users from emails
    const newUsers: User[] = emails.map((email) => ({
      id: crypto.randomUUID(),
      name: email.split("@")[0] ?? "User",
      email,
      roles: [],
      lastSeenAt: null,
    }));
    setUsers((prev) => [...newUsers, ...prev]);
  }, []);

  const handleRoleToggle = useCallback(
    (userId: string, roleId: string, checked: boolean) => {
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          const role = mockRoles.find((r) => r.id === roleId);
          if (!role) return user;

          if (checked) {
            // Add role
            return {
              ...user,
              roles: [...user.roles, role],
            };
          } else {
            // Remove role
            return {
              ...user,
              roles: user.roles.filter((r) => r.id !== roleId),
            };
          }
        }),
      );
    },
    [],
  );

  const handleRemoveUser = useCallback((user: User) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }, []);

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
              availableRoles={mockRoles}
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
