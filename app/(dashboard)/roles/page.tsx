"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  RolesTable,
  RoleSearchInput,
  RolesPagination,
  RoleDialog,
} from "@/components/roles";
import type {
  Role,
  Permission,
  RoleUser,
  RoleSort,
  RoleFormData,
} from "@/types/role";

// Mock permissions - will be replaced with API data
const mockPermissions: Permission[] = [
  {
    id: "displays.view",
    name: "View Displays",
    description: "Can view all displays and their status",
  },
  {
    id: "displays.manage",
    name: "Manage Displays",
    description: "Can add, edit, and remove displays",
  },
  {
    id: "displays.control",
    name: "Control Displays",
    description: "Can control display power and refresh",
  },
  {
    id: "content.view",
    name: "View Content",
    description: "Can view all content items",
  },
  {
    id: "content.manage",
    name: "Manage Content",
    description: "Can upload, edit, and delete content",
  },
  {
    id: "playlists.view",
    name: "View Playlists",
    description: "Can view all playlists",
  },
  {
    id: "playlists.manage",
    name: "Manage Playlists",
    description: "Can create, edit, and delete playlists",
  },
  {
    id: "schedules.view",
    name: "View Schedules",
    description: "Can view all schedules",
  },
  {
    id: "schedules.manage",
    name: "Manage Schedules",
    description: "Can create, edit, and delete schedules",
  },
  {
    id: "users.view",
    name: "View Users",
    description: "Can view all users in the organization",
  },
  {
    id: "users.manage",
    name: "Manage Users",
    description: "Can invite, edit, and remove users",
  },
  {
    id: "roles.view",
    name: "View Roles",
    description: "Can view all roles and permissions",
  },
  {
    id: "roles.manage",
    name: "Manage Roles",
    description: "Can create, edit, and delete roles",
  },
];

// Mock users - will be replaced with API data
const mockUsers: RoleUser[] = [
  { id: "1", name: "Admin", email: "john.doe@example.com" },
  { id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
  { id: "3", name: "Bob Johnson", email: "bob.johnson@example.com" },
];

// Mock roles - will be replaced with API data
const initialRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    permissions: mockPermissions,
    users: [mockUsers[0]],
    usersCount: 1,
  },
];

export default function RolesPage(): React.ReactElement {
  // State
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RoleSort>({
    field: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Pagination
  const pageSize = 10;

  // Handlers
  const handleCreate = useCallback(() => {
    setDialogMode("create");
    setSelectedRole(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setDialogMode("edit");
    setSelectedRole(role);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (data: RoleFormData) => {
      if (dialogMode === "create") {
        const newRole: Role = {
          id: crypto.randomUUID(),
          name: data.name,
          permissions: mockPermissions.filter((p) =>
            data.permissionIds.includes(p.id),
          ),
          users: mockUsers.filter((u) => data.userIds.includes(u.id)),
          usersCount: data.userIds.length,
        };
        setRoles((prev) => [...prev, newRole]);
      } else if (selectedRole) {
        setRoles((prev) =>
          prev.map((role) => {
            if (role.id !== selectedRole.id) return role;
            return {
              ...role,
              name: data.name,
              permissions: mockPermissions.filter((p) =>
                data.permissionIds.includes(p.id),
              ),
              users: mockUsers.filter((u) => data.userIds.includes(u.id)),
              usersCount: data.userIds.length,
            };
          }),
        );
      }
    },
    [dialogMode, selectedRole],
  );

  const handleDelete = useCallback((role: Role) => {
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
  }, []);

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const searchLower = search.toLowerCase();
    return roles.filter((role) =>
      role.name.toLowerCase().includes(searchLower),
    );
  }, [roles, search]);

  // Sort roles
  const sortedRoles = useMemo(() => {
    return [...filteredRoles].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "usersCount":
          return (a.usersCount - b.usersCount) * direction;
        default:
          return 0;
      }
    });
  }, [filteredRoles, sort]);

  // Paginate roles
  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRoles.slice(start, start + pageSize);
  }, [sortedRoles, page]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Roles">
        <Button onClick={handleCreate}>
          <IconPlus className="size-4" />
          Create Role
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <RoleSearchInput value={search} onChange={setSearch} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          <div className="overflow-hidden rounded-lg border">
            <RolesTable
              roles={paginatedRoles}
              sort={sort}
              onSortChange={setSort}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {/* Pagination */}
        <RolesPagination
          page={page}
          pageSize={pageSize}
          total={sortedRoles.length}
          onPageChange={setPage}
        />
      </div>

      {/* Create/Edit Role Dialog */}
      <RoleDialog
        mode={dialogMode}
        role={selectedRole}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permissions={mockPermissions}
        availableUsers={mockUsers}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
