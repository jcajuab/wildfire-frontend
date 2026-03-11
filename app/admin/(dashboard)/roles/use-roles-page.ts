"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useGetRolePermissionsQuery,
  useGetRoleUsersQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSetRolePermissionsMutation,
  useSetUserRolesMutation,
  useLazyGetUserRolesQuery,
  type RbacRolesListResponse,
  type RbacPermission,
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
export const PAGE_SIZE = 10;

export interface UseRolesPageResult {
  // Permissions
  canUpdateRole: boolean;
  canDeleteRole: boolean;
  canReadUsers: boolean;

  // Filter state
  search: string;
  page: number;
  sort: RoleSort;

  // Query data
  roles: Role[];
  rolesData: RbacRolesListResponse | undefined;
  permissions: RbacPermission[];
  initialUsers: {
    id: string;
    username: string;
    name: string;
    email: string | null;
  }[];
  rolePermissionsData: RbacPermission[] | undefined;
  editDataReady: boolean;
  rolesLoading: boolean;
  rolesError: boolean;

  // Dialog state
  dialogOpen: boolean;
  dialogMode: "create" | "edit";
  selectedRole: Role | null;
  roleToDelete: Role | null;
  isDeleteDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setDialogOpen: (open: boolean) => void;
  setSelectedRole: (role: Role | null) => void;
  setRoleToDelete: (role: Role | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;

  // Handlers
  handleSearchChange: (value: string) => void;
  handleSortChange: (nextSort: RoleSort) => void;
  handleCreate: () => void;
  handleEdit: (role: Role) => void;
  handleSubmit: (data: RoleFormData) => Promise<void>;
  handleDeleteRole: (role: Role) => void;
  deleteRole: (id: string) => Promise<void>;
}

export function useRolesPage(): UseRolesPageResult {
  const canUpdateRole = useCan("roles:update");
  const canDeleteRole = useCan("roles:delete");
  const canReadUsers = useCan("users:read");

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

  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery({
    page,
    pageSize: PAGE_SIZE,
    q: search || undefined,
    sortBy: sortField,
    sortDirection,
  });
  const { data: permissionsData } = useGetPermissionsQuery();

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRoleMutation] = useDeleteRoleMutation();
  const [setRolePermissions] = useSetRolePermissionsMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      !rolePermissionsFetching &&
      rolePermissionsSuccess &&
      rolePermissionsData !== undefined &&
      (!canReadUsers ||
        (!roleUsersLoading &&
          !roleUsersFetching &&
          roleUsersSuccess &&
          roleUsersData !== undefined)));

  const sort = useMemo<RoleSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

  const roles: Role[] = useMemo(
    () =>
      (rolesData?.items ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role.usersCount,
      })),
    [rolesData?.items],
  );

  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);

  const initialUsers = useMemo(
    () =>
      (roleUsersData ?? []).map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      })),
    [roleUsersData],
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
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setDialogMode("edit");
    setSelectedRole(role);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
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
        notifyApiError(err, "Something went wrong");
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

  const handleDeleteRole = useCallback((role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  }, []);

  const deleteRole = useCallback(
    async (id: string) => {
      await deleteRoleMutation(id).unwrap();
    },
    [deleteRoleMutation],
  );

  return {
    canUpdateRole,
    canDeleteRole,
    canReadUsers,
    search,
    page,
    sort,
    roles,
    rolesData,
    permissions,
    initialUsers,
    rolePermissionsData,
    editDataReady,
    rolesLoading,
    rolesError,
    dialogOpen,
    dialogMode,
    selectedRole,
    roleToDelete,
    isDeleteDialogOpen,
    setPage,
    setDialogOpen,
    setSelectedRole,
    setRoleToDelete,
    setIsDeleteDialogOpen,
    handleSearchChange,
    handleSortChange,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDeleteRole,
    deleteRole,
  };
}
