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
import {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useGetUsersQuery,
  useGetRolePermissionsQuery,
  useGetRoleUsersQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSetRolePermissionsMutation,
  useSetUserRolesMutation,
  useLazyGetUserRolesQuery,
} from "@/lib/api/rbac-api";
import type { Role, RoleSort, RoleFormData } from "@/types/role";

export default function RolesPage(): React.ReactElement {

  // API
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useGetRolesQuery();
  const { data: permissionsData } = useGetPermissionsQuery();
  const { data: usersData } = useGetUsersQuery();

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [setRolePermissions] = useSetRolePermissionsMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When editing, fetch role permissions and users for dialog
  const { data: rolePermissionsData } = useGetRolePermissionsQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
  });
  const { data: roleUsersData } = useGetRoleUsersQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
  });

  const pageSize = 10;

  // Map API data to UI types
  const roles: Role[] = useMemo(
    () =>
      (rolesData ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      })),
    [rolesData],
  );
  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);
  const availableUsers = useMemo(
    () =>
      (usersData ?? []).map((u) => ({ id: u.id, name: u.name, email: u.email })),
    [usersData],
  );

  const handleCreate = useCallback(() => {
    setDialogMode("create");
    setSelectedRole(null);
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setDialogMode("edit");
    setSelectedRole(role);
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
      setSubmitError(null);
      try {
        if (dialogMode === "create") {
          const role = await createRole({
            name: data.name,
            description: null,
          }).unwrap();
          await setRolePermissions({
            roleId: role.id,
            permissionIds: [...data.permissionIds],
          }).unwrap();
          for (const userId of data.userIds) {
            const currentRoles = await getUserRolesTrigger(userId).unwrap();
            await setUserRoles({
              userId,
              roleIds: [...currentRoles.map((r) => r.id), role.id],
            }).unwrap();
          }
          setDialogOpen(false);
        } else if (selectedRole) {
          await updateRole({
            id: selectedRole.id,
            name: data.name,
          }).unwrap();
          await setRolePermissions({
            roleId: selectedRole.id,
            permissionIds: [...data.permissionIds],
          }).unwrap();
          const currentUserIds = (roleUsersData ?? []).map((u) => u.id);
          const desiredUserIds = [...data.userIds];
          const toAdd = desiredUserIds.filter((id) => !currentUserIds.includes(id));
          const toRemove = currentUserIds.filter((id) => !desiredUserIds.includes(id));
          for (const userId of toAdd) {
            const currentRoles = await getUserRolesTrigger(userId).unwrap();
            await setUserRoles({
              userId,
              roleIds: [...currentRoles.map((r) => r.id), selectedRole.id],
            }).unwrap();
          }
          for (const userId of toRemove) {
            const currentRoles = await getUserRolesTrigger(userId).unwrap();
            await setUserRoles({
              userId,
              roleIds: currentRoles.map((r) => r.id).filter((id) => id !== selectedRole.id),
            }).unwrap();
          }
          setDialogOpen(false);
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [
      dialogMode,
      selectedRole,
      roleUsersData,
      createRole,
      updateRole,
      setRolePermissions,
      setUserRoles,
      getUserRolesTrigger,
    ],
  );

  const handleDelete = useCallback(
    async (role: Role) => {
      if (!confirm(`Delete role "${role.name}"?`)) return;
      setSubmitError(null);
      try {
        await deleteRole(role.id).unwrap();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to delete role");
      }
    },
    [deleteRole],
  );

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const searchLower = search.toLowerCase();
    return roles.filter((role) => role.name.toLowerCase().includes(searchLower));
  }, [roles, search]);

  const sortedRoles = useMemo(() => {
    return [...filteredRoles].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "usersCount":
          return ((a.usersCount ?? 0) - (b.usersCount ?? 0)) * direction;
        default:
          return 0;
      }
    });
  }, [filteredRoles, sort]);

  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRoles.slice(start, start + pageSize);
  }, [sortedRoles, page]);

  if (rolesLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Loading roles…</p>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <p className="text-destructive">Failed to load roles. Check the API and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Roles">
        <Button onClick={handleCreate}>
          <IconPlus className="size-4" />
          Create Role
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
          <RoleSearchInput value={search} onChange={setSearch} />
        </div>

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

        <RolesPagination
          page={page}
          pageSize={pageSize}
          total={sortedRoles.length}
          onPageChange={setPage}
        />
      </div>

      <RoleDialog
        mode={dialogMode}
        role={selectedRole}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permissions={permissions}
        availableUsers={availableUsers}
        initialPermissionIds={rolePermissionsData?.map((p) => p.id)}
        initialUserIds={roleUsersData?.map((u) => u.id)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
