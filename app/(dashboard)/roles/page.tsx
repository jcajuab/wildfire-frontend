"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  RolesTable,
  RoleSearchInput,
  CreateRoleDialog,
  EditRoleDialog,
} from "@/components/roles";
import type {
  Role,
  Permission,
  RoleSort,
  CreateRoleFormData,
  EditRoleFormData,
} from "@/types/role";

// Mock permissions - will be replaced with API data
const mockPermissions: Permission[] = [
  {
    id: "content.view",
    name: "View Content",
    description: "Can view all content items",
    category: "Content",
  },
  {
    id: "content.create",
    name: "Create Content",
    description: "Can upload and create new content",
    category: "Content",
  },
  {
    id: "content.edit",
    name: "Edit Content",
    description: "Can edit existing content",
    category: "Content",
  },
  {
    id: "content.delete",
    name: "Delete Content",
    description: "Can delete content items",
    category: "Content",
  },
  {
    id: "displays.view",
    name: "View Displays",
    description: "Can view all displays",
    category: "Displays",
  },
  {
    id: "displays.manage",
    name: "Manage Displays",
    description: "Can add, edit, and remove displays",
    category: "Displays",
  },
  {
    id: "playlists.view",
    name: "View Playlists",
    description: "Can view all playlists",
    category: "Playlists",
  },
  {
    id: "playlists.manage",
    name: "Manage Playlists",
    description: "Can create, edit, and delete playlists",
    category: "Playlists",
  },
  {
    id: "schedules.view",
    name: "View Schedules",
    description: "Can view all schedules",
    category: "Schedules",
  },
  {
    id: "schedules.manage",
    name: "Manage Schedules",
    description: "Can create, edit, and delete schedules",
    category: "Schedules",
  },
  {
    id: "users.view",
    name: "View Users",
    description: "Can view all users",
    category: "Users",
  },
  {
    id: "users.manage",
    name: "Manage Users",
    description: "Can invite, edit, and remove users",
    category: "Users",
  },
  {
    id: "roles.manage",
    name: "Manage Roles",
    description: "Can create, edit, and delete roles",
    category: "Users",
  },
];

// Mock roles - will be replaced with API data
const mockRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    description: "Full access to all features and settings",
    permissions: mockPermissions,
    usersCount: 2,
    createdAt: "2023-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Editor",
    description: "Can manage content, playlists, and schedules",
    permissions: mockPermissions.filter((p) =>
      ["content", "playlists", "schedules"].some((cat) => p.id.startsWith(cat)),
    ),
    usersCount: 5,
    createdAt: "2023-02-20T14:30:00Z",
  },
  {
    id: "3",
    name: "Viewer",
    description: "Read-only access to content and displays",
    permissions: mockPermissions.filter((p) => p.id.endsWith(".view")),
    usersCount: 12,
    createdAt: "2023-03-10T09:15:00Z",
  },
];

export default function RolesPage(): React.ReactElement {
  // State
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RoleSort>({
    field: "name",
    direction: "asc",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Handlers
  const handleCreate = useCallback((data: CreateRoleFormData) => {
    const newRole: Role = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      permissions: mockPermissions.filter((p) =>
        data.permissionIds.includes(p.id),
      ),
      usersCount: 0,
      createdAt: new Date().toISOString(),
    };
    setRoles((prev) => [...prev, newRole]);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    (roleId: string, data: EditRoleFormData) => {
      setRoles((prev) =>
        prev.map((role) => {
          if (role.id !== roleId) return role;
          return {
            ...role,
            name: data.name,
            description: data.description,
            permissions: mockPermissions.filter((p) =>
              data.permissionIds.includes(p.id),
            ),
          };
        }),
      );
    },
    [],
  );

  const handleDelete = useCallback((role: Role) => {
    // TODO: Add confirmation dialog
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
  }, []);

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const searchLower = search.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchLower) ||
        role.description.toLowerCase().includes(searchLower),
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
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            direction
          );
        default:
          return 0;
      }
    });
  }, [filteredRoles, sort]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Roles">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <IconPlus className="size-4" />
          Create Role
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-lg font-semibold">All Roles</h2>
          <RoleSearchInput value={search} onChange={setSearch} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          <RolesTable
            roles={sortedRoles}
            sort={sort}
            onSortChange={setSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        permissions={mockPermissions}
        onCreate={handleCreate}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        role={selectedRole}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        permissions={mockPermissions}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
