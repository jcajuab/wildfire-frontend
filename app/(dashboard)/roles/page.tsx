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
import { useApp } from "@/context/app-context";
import type { Role, RoleSort, RoleFormData } from "@/types/role";

export default function RolesPage(): React.ReactElement {
  // Context
  const { roles, users, permissions, addRole, updateRole, removeRole } =
    useApp();

  // State
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
      // Map user IDs to RoleUser objects for the role
      const selectedUsers = users
        .filter((u) => data.userIds.includes(u.id))
        .map((u) => ({ id: u.id, name: u.name, email: u.email }));

      const selectedPermissions = permissions.filter((p) =>
        data.permissionIds.includes(p.id),
      );

      if (dialogMode === "create") {
        const newRole: Role = {
          id: crypto.randomUUID(),
          name: data.name,
          permissions: selectedPermissions,
          users: selectedUsers,
          usersCount: selectedUsers.length,
        };
        addRole(newRole);
      } else if (selectedRole) {
        const updatedRole: Role = {
          ...selectedRole,
          name: data.name,
          permissions: selectedPermissions,
          users: selectedUsers,
          usersCount: selectedUsers.length,
        };
        updateRole(updatedRole);
      }
    },
    [dialogMode, selectedRole, users, permissions, addRole, updateRole],
  );

  const handleDelete = useCallback(
    (role: Role) => {
      removeRole(role.id);
    },
    [removeRole],
  );

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
        permissions={permissions}
        availableUsers={users}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
