"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
import { RoleDialog } from "@/components/roles/role-dialog";
import { RoleSearchInput } from "@/components/roles/role-search-input";
import { RolesPagination } from "@/components/roles/roles-pagination";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
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
import type {
  Role,
  RoleFormData,
  RoleSort,
  RoleSortDirection,
  RoleSortField,
} from "@/types/role";

const ROLE_SORT_FIELDS = ["name", "usersCount"] as const;
const ROLE_SORT_DIRECTIONS = ["asc", "desc"] as const;

export default function RolesPage(): React.ReactElement {
  const canUpdateRole = useCan("roles:update");
  const canDeleteRole = useCan("roles:delete");
  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery();
  const { data: permissionsData } = useGetPermissionsQuery();
  const { data: usersData } = useGetUsersQuery();

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [setRolePermissions] = useSetRolePermissionsMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const [search, setSearch] = useQueryStringState("q", "");
  const [sortField, setSortField] = useQueryEnumState<RoleSortField>(
    "sortField",
    "name",
    ROLE_SORT_FIELDS,
  );
  const [sortDirection, setSortDirection] =
    useQueryEnumState<RoleSortDirection>(
      "sortDir",
      "asc",
      ROLE_SORT_DIRECTIONS,
    );
  const [page, setPage] = useQueryNumberState("page", 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: rolePermissionsData,
    isLoading: rolePermissionsLoading,
    isFetching: rolePermissionsFetching,
    isSuccess: rolePermissionsSuccess,
  } = useGetRolePermissionsQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
    refetchOnMountOrArgChange: true,
  });
  const {
    data: roleUsersData,
    isLoading: roleUsersLoading,
    isFetching: roleUsersFetching,
    isSuccess: roleUsersSuccess,
  } = useGetRoleUsersQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
    refetchOnMountOrArgChange: true,
  });

  const editDataReady =
    dialogMode === "create" ||
    (dialogMode === "edit" &&
      !rolePermissionsLoading &&
      !roleUsersLoading &&
      !rolePermissionsFetching &&
      !roleUsersFetching &&
      rolePermissionsSuccess &&
      roleUsersSuccess &&
      rolePermissionsData !== undefined &&
      roleUsersData !== undefined);

  const pageSize = 10;

  const sort = useMemo<RoleSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

  const roles: Role[] = useMemo(
    () =>
      (rolesData ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role.usersCount,
      })),
    [rolesData],
  );
  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);
  const availableUsers = useMemo(
    () =>
      (usersData ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    [usersData],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleSortChange = useCallback(
    (nextSort: RoleSort) => {
      setSortField(nextSort.field);
      setSortDirection(nextSort.direction);
      setPage(1);
    },
    [setSortField, setSortDirection, setPage],
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
            description: data.description ?? null,
          }).unwrap();
          await setRolePermissions({
            roleId: role.id,
            permissionIds: [...data.permissionIds],
          }).unwrap();
          await Promise.all(
            data.userIds.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: [
                  ...currentRoles.map((roleItem) => roleItem.id),
                  role.id,
                ],
              }).unwrap();
            }),
          );
          setDialogOpen(false);
        } else if (selectedRole) {
          await updateRole({
            id: selectedRole.id,
            name: data.name,
            description: data.description ?? null,
          }).unwrap();
          await setRolePermissions({
            roleId: selectedRole.id,
            permissionIds: [...data.permissionIds],
          }).unwrap();
          const currentUserIds = (roleUsersData ?? []).map((user) => user.id);
          const desiredUserIds = [...data.userIds];
          const toAdd = desiredUserIds.filter(
            (id) => !currentUserIds.includes(id),
          );
          const toRemove = currentUserIds.filter(
            (id) => !desiredUserIds.includes(id),
          );
          await Promise.all(
            toAdd.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: [
                  ...currentRoles.map((roleItem) => roleItem.id),
                  selectedRole.id,
                ],
              }).unwrap();
            }),
          );
          await Promise.all(
            toRemove.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: currentRoles
                  .map((roleItem) => roleItem.id)
                  .filter((id) => id !== selectedRole.id),
              }).unwrap();
            }),
          );
          setDialogOpen(false);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Something went wrong",
        );
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

  const handleDeleteRequest = useCallback((role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  }, []);

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const searchLower = search.toLowerCase();
    return roles.filter((role) =>
      role.name.toLowerCase().includes(searchLower),
    );
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
      <DashboardPage.Root>
        <DashboardPage.Header title="Roles" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading roles…</p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  if (rolesError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Roles" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-destructive">
              Failed to load roles. Check the API and try again.
            </p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Roles"
        actions={
          <Can permission="roles:create">
            <Button onClick={handleCreate}>
              <IconPlus className="size-4" />
              Create Role
            </Button>
          </Can>
        }
      />

      {submitError ? (
        <DashboardPage.Banner tone="danger">{submitError}</DashboardPage.Banner>
      ) : null}

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <h2 className="text-base font-semibold">Search Results</h2>
          <RoleSearchInput
            value={search}
            onChange={handleSearchChange}
            className="w-full max-w-none md:w-72"
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <div className="overflow-hidden rounded-lg border">
            <RolesTable
              roles={paginatedRoles}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              canEdit={canUpdateRole}
              canDelete={canDeleteRole}
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <RolesPagination
            page={page}
            pageSize={pageSize}
            total={sortedRoles.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <RoleDialog
        mode={dialogMode}
        role={selectedRole}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedRole(null);
        }}
        editDataReady={editDataReady}
        permissions={permissions}
        availableUsers={availableUsers}
        initialPermissionIds={rolePermissionsData?.map(
          (permission) => permission.id,
        )}
        initialUserIds={roleUsersData?.map((user) => user.id)}
        onSubmit={handleSubmit}
      />

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete role?"
        description={
          roleToDelete
            ? `This will permanently delete "${roleToDelete.name}".`
            : undefined
        }
        confirmLabel="Delete role"
        onConfirm={async () => {
          if (!roleToDelete) return;
          setSubmitError(null);
          try {
            await deleteRole(roleToDelete.id).unwrap();
            setRoleToDelete(null);
          } catch (err) {
            setSubmitError(
              err instanceof Error ? err.message : "Failed to delete role",
            );
            throw err;
          }
        }}
      />
    </DashboardPage.Root>
  );
}
