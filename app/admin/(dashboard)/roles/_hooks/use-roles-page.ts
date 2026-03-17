"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import {
  useDeleteRoleMutation,
  useGetRolesQuery,
  type RbacRolesListResponse,
} from "@/lib/api/rbac-api";
import { ROLE_CREATE_PATH, getRoleEditPath } from "@/lib/role-paths";
import type { Role, RoleSort } from "@/types/role";
import { useRolesFilters } from "./use-roles-filters";

export const PAGE_SIZE = 10;

export interface UseRolesPageResult {
  // Permissions
  canUpdateRole: boolean;
  canDeleteRole: boolean;

  // Filter state
  search: string;
  page: number;
  sort: RoleSort;

  // Query data
  roles: Role[];
  rolesData: RbacRolesListResponse | undefined;
  rolesLoading: boolean;
  rolesError: boolean;

  roleToDelete: Role | null;
  isDeleteDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setRoleToDelete: (role: Role | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;

  // Handlers
  handleSearchChange: (value: string) => void;
  handleSortChange: (nextSort: RoleSort) => void;
  handleCreate: () => void;
  handleEdit: (role: Role) => void;
  handleDeleteRole: (role: Role) => void;
  deleteRole: (id: string) => Promise<void>;
}

export function useRolesPage(): UseRolesPageResult {
  const router = useRouter();
  const canUpdateRole = useCan("roles:update");
  const canDeleteRole = useCan("roles:delete");

  const filters = useRolesFilters();
  const [deleteRoleMutation] = useDeleteRoleMutation();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleCreate = useCallback(() => {
    router.push(ROLE_CREATE_PATH);
  }, [router]);

  const handleEdit = useCallback(
    (role: Role) => {
      router.push(getRoleEditPath(role.id));
    },
    [router],
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
    search: filters.search,
    page: filters.page,
    sort: filters.sort,
    roles,
    rolesData: rolesData as RbacRolesListResponse | undefined,
    rolesLoading,
    rolesError,
    roleToDelete,
    isDeleteDialogOpen,
    setPage: filters.setPage,
    setRoleToDelete,
    setIsDeleteDialogOpen,
    handleSearchChange: filters.handleSearchChange,
    handleSortChange: filters.handleSortChange,
    handleCreate,
    handleEdit,
    handleDeleteRole,
    deleteRole,
  };
}
