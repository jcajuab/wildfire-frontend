"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/use-can";
import {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useGetRolePermissionsQuery,
  useGetRoleUsersQuery,
  type RbacRolesListResponse,
  type RbacPermission,
} from "@/lib/api/rbac-api";
import type { Role, RoleFormData, RoleSort } from "@/types/role";
import { useRolesFilters } from "./use-roles-filters";
import { useRolesDialogs } from "./use-roles-dialogs";
import { useRolesHandlers } from "./use-roles-handlers";

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

  const filters = useRolesFilters();
  const dialogs = useRolesDialogs();

  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery({
    page: filters.page,
    pageSize: PAGE_SIZE,
    q: filters.search || undefined,
    sortBy: filters.sortField,
    sortDirection: filters.sortDirection,
  });

  const { data: permissionsData } = useGetPermissionsQuery();

  const {
    data: rolePermissionsData,
    isLoading: rolePermissionsLoading,
    isFetching: rolePermissionsFetching,
    isSuccess: rolePermissionsSuccess,
  } = useGetRolePermissionsQuery(dialogs.selectedRole?.id ?? "", {
    skip: !dialogs.dialogOpen || !dialogs.selectedRole,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: roleUsersData,
    isLoading: roleUsersLoading,
    isFetching: roleUsersFetching,
    isSuccess: roleUsersSuccess,
  } = useGetRoleUsersQuery(dialogs.selectedRole?.id ?? "", {
    skip: !dialogs.dialogOpen || !dialogs.selectedRole,
    refetchOnMountOrArgChange: true,
  });

  const handlers = useRolesHandlers({
    dialogMode: dialogs.dialogMode,
    selectedRole: dialogs.selectedRole,
    roleUsersData,
    setDialogOpen: dialogs.setDialogOpen,
  });

  const editDataReady =
    dialogs.dialogMode === "create" ||
    (dialogs.dialogMode === "edit" &&
      !rolePermissionsLoading &&
      !rolePermissionsFetching &&
      rolePermissionsSuccess &&
      rolePermissionsData !== undefined &&
      (!canReadUsers ||
        (!roleUsersLoading &&
          !roleUsersFetching &&
          roleUsersSuccess &&
          roleUsersData !== undefined)));

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

  return {
    canUpdateRole,
    canDeleteRole,
    canReadUsers,
    search: filters.search,
    page: filters.page,
    sort: filters.sort,
    roles,
    rolesData: rolesData as RbacRolesListResponse | undefined,
    permissions: permissions as RbacPermission[],
    initialUsers,
    rolePermissionsData: rolePermissionsData as RbacPermission[] | undefined,
    editDataReady,
    rolesLoading,
    rolesError,
    dialogOpen: dialogs.dialogOpen,
    dialogMode: dialogs.dialogMode,
    selectedRole: dialogs.selectedRole,
    roleToDelete: dialogs.roleToDelete,
    isDeleteDialogOpen: dialogs.isDeleteDialogOpen,
    setPage: filters.setPage,
    setDialogOpen: dialogs.setDialogOpen,
    setSelectedRole: dialogs.setSelectedRole,
    setRoleToDelete: dialogs.setRoleToDelete,
    setIsDeleteDialogOpen: dialogs.setIsDeleteDialogOpen,
    handleSearchChange: filters.handleSearchChange,
    handleSortChange: filters.handleSortChange,
    handleCreate: dialogs.handleCreate,
    handleEdit: dialogs.handleEdit,
    handleSubmit: handlers.handleSubmit,
    handleDeleteRole: dialogs.handleDeleteRole,
    deleteRole: handlers.deleteRole,
  };
}
