"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  rbacApi,
  useDeleteRoleMutation,
  useGetRolesQuery,
  type RbacRoleListQuery,
  type RbacRolesListResponse,
} from "@/lib/api/rbac-api";
import { ROLE_CREATE_PATH, getRoleEditPath } from "@/lib/role-paths";
import type { Role, RoleSort } from "@/types/role";
import { ROLES_PAGE_SIZE } from "@/lib/roles-search-params";

import { useRolesFilters } from "./use-roles-filters";

export const PAGE_SIZE = ROLES_PAGE_SIZE;

function normalizedRolesQueryKey(query: RbacRoleListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    q: query.q ?? null,
    sortBy: query.sortBy ?? "name",
    sortDirection: query.sortDirection ?? "asc",
  });
}

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
  rolesFetching: boolean;
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

export function useRolesPage(options?: {
  readonly initialList?: {
    readonly queryArgs: RbacRoleListQuery;
    readonly data: RbacRolesListResponse;
  };
}): UseRolesPageResult {
  const router = useRouter();
  const canUpdateRole = useCan("roles:update");
  const canDeleteRole = useCan("roles:delete");

  const filters = useRolesFilters();
  const debouncedSearch = useDebounce(filters.search, 500);
  const [deleteRoleMutation] = useDeleteRoleMutation();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const rolesQuery: RbacRoleListQuery = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    q: debouncedSearch || undefined,
    sortBy: filters.sortField,
    sortDirection: filters.sortDirection,
  };
  const isInitialListQuery =
    options?.initialList != null &&
    normalizedRolesQueryKey(options.initialList.queryArgs) ===
      normalizedRolesQueryKey(rolesQuery);

  const {
    data: rolesData,
    isLoading: rolesQueryLoading,
    isFetching: rolesQueryFetching,
    isError: rolesError,
  } = useGetRolesQuery(rolesQuery, {
    skip: isInitialListQuery,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const cachedInitialList = rbacApi.endpoints.getRoles.useQueryState(
    rolesQuery,
    { skip: !isInitialListQuery },
  );
  const effectiveRolesData =
    rolesData ??
    cachedInitialList.data ??
    (isInitialListQuery ? options?.initialList?.data : undefined);
  const rolesLoading =
    effectiveRolesData == null &&
    (isInitialListQuery ? false : rolesQueryLoading);
  const rolesFetching = isInitialListQuery
    ? cachedInitialList.isFetching
    : rolesQueryFetching;

  const roles: Role[] = useMemo(
    () =>
      (effectiveRolesData?.items ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role.usersCount,
      })),
    [effectiveRolesData?.items],
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
    rolesData: effectiveRolesData as RbacRolesListResponse | undefined,
    rolesLoading,
    rolesFetching,
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
