"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useGetPermissionsQuery } from "@/lib/api/rbac-api";
import { ROLE_INDEX_PATH } from "@/lib/role-paths";
import type { Permission, RoleFormData, RoleUser } from "@/types/role";
import { useRolesHandlers } from "../_hooks/use-roles-handlers";

export interface UseCreateRolePageResult {
  readonly permissions: readonly Permission[];
  readonly canReadUsers: boolean;
  readonly initialUsers: readonly RoleUser[];
  handleCancel: () => void;
  handleCreateRole: (data: RoleFormData) => Promise<void>;
}

export function useCreateRolePage(): UseCreateRolePageResult {
  const router = useRouter();
  const canReadUsers = useCan("users:read");
  const { data: permissionsData } = useGetPermissionsQuery();

  const permissions = useMemo<readonly Permission[]>(
    () => permissionsData ?? [],
    [permissionsData],
  );

  const handleCancel = useCallback(() => {
    router.push(ROLE_INDEX_PATH);
  }, [router]);

  const { handleSubmit: handleCreateRole } = useRolesHandlers({
    mode: "create",
    selectedRole: null,
    roleUsersData: undefined,
    onSuccess: handleCancel,
  });

  return {
    permissions,
    canReadUsers,
    initialUsers: [],
    handleCancel,
    handleCreateRole,
  };
}
