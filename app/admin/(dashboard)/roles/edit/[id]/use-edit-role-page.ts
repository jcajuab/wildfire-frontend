"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useGetPermissionsQuery,
  useGetRolePermissionsQuery,
  useGetRoleQuery,
  useGetRoleUsersQuery,
} from "@/lib/api/rbac-api";
import { ROLE_INDEX_PATH } from "@/lib/role-paths";
import type { Permission, Role, RoleFormData, RoleUser } from "@/types/role";
import { useRolesHandlers } from "../../_hooks/use-roles-handlers";

export type EditRolePageState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly role: Role;
      readonly permissions: readonly Permission[];
      readonly initialPermissionIds: readonly string[];
      readonly initialUsers: readonly RoleUser[];
    }
  | { readonly status: "notFound"; readonly message: string }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "nonEditable";
      readonly role: Role;
      readonly message: string;
    };

export interface UseEditRolePageResult {
  readonly state: EditRolePageState;
  readonly canReadUsers: boolean;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: (data: RoleFormData) => Promise<void>;
}

const toRole = (role: {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}): Role => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
});

const toRoleUsers = (
  users: readonly {
    id: string;
    username: string;
    name: string;
    email: string | null;
  }[],
): readonly RoleUser[] =>
  users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
  }));

const isNotFoundError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    status?: number | string;
    originalStatus?: number | string;
  };

  return candidate.status === 404 || candidate.originalStatus === 404;
};

const hasValue = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function useEditRolePage(
  roleId: string | null | undefined,
): UseEditRolePageResult {
  const router = useRouter();
  const canReadUsers = useCan("users:read");
  const hasRoleId = hasValue(roleId);
  const resolvedRoleId = hasRoleId ? roleId : "";

  const {
    data: roleData,
    error: roleError,
    isLoading: roleLoading,
    isFetching: roleFetching,
  } = useGetRoleQuery(resolvedRoleId, {
    skip: !hasRoleId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: permissionsData,
    error: permissionsError,
    isLoading: permissionsLoading,
    isFetching: permissionsFetching,
  } = useGetPermissionsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: rolePermissionsData,
    error: rolePermissionsError,
    isLoading: rolePermissionsLoading,
    isFetching: rolePermissionsFetching,
  } = useGetRolePermissionsQuery(resolvedRoleId, {
    skip: !hasRoleId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: roleUsersData,
    error: roleUsersError,
    isLoading: roleUsersLoading,
    isFetching: roleUsersFetching,
  } = useGetRoleUsersQuery(resolvedRoleId, {
    skip: !hasRoleId || !canReadUsers,
    refetchOnMountOrArgChange: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const state = useMemo<EditRolePageState>(() => {
    if (!hasRoleId) {
      return {
        status: "notFound",
        message: "The requested role was not found.",
      };
    }

    if (
      roleLoading ||
      roleFetching ||
      permissionsLoading ||
      permissionsFetching ||
      rolePermissionsLoading ||
      rolePermissionsFetching ||
      (canReadUsers && (roleUsersLoading || roleUsersFetching))
    ) {
      return { status: "loading" };
    }

    const notFoundError = [
      roleError,
      rolePermissionsError,
      roleUsersError,
    ].find((error) => isNotFoundError(error));

    if (notFoundError !== undefined) {
      return {
        status: "notFound",
        message: getApiErrorMessage(
          notFoundError,
          "The requested role was not found.",
        ),
      };
    }

    const genericError = [
      roleError,
      permissionsError,
      rolePermissionsError,
      roleUsersError,
    ].find((error) => error !== undefined);

    if (genericError !== undefined) {
      return {
        status: "error",
        message: getApiErrorMessage(
          genericError,
          "Failed to load role details.",
        ),
      };
    }

    if (
      roleData === undefined ||
      permissionsData === undefined ||
      rolePermissionsData === undefined
    ) {
      return { status: "loading" };
    }

    if (canReadUsers && roleUsersData === undefined) {
      return { status: "loading" };
    }

    const role = toRole(roleData);
    if (role.isSystem) {
      return {
        status: "nonEditable",
        role,
        message: "System roles are managed by Wildfire and cannot be edited.",
      };
    }

    return {
      status: "ready",
      role,
      permissions: permissionsData,
      initialPermissionIds: rolePermissionsData.map(
        (permission) => permission.id,
      ),
      initialUsers: canReadUsers ? toRoleUsers(roleUsersData ?? []) : [],
    };
  }, [
    canReadUsers,
    hasRoleId,
    permissionsData,
    permissionsError,
    permissionsFetching,
    permissionsLoading,
    roleData,
    roleError,
    roleFetching,
    roleLoading,
    rolePermissionsData,
    rolePermissionsError,
    rolePermissionsFetching,
    rolePermissionsLoading,
    roleUsersData,
    roleUsersError,
    roleUsersFetching,
    roleUsersLoading,
  ]);

  const handleCancel = useCallback(() => {
    router.push(ROLE_INDEX_PATH);
  }, [router]);

  const { handleSubmit } = useRolesHandlers({
    mode: "edit",
    selectedRole: state.status === "ready" ? state.role : null,
    roleUsersData: canReadUsers ? roleUsersData : undefined,
    onSuccess: () => {
      toast.success("Role updated.");
      handleCancel();
    },
  });

  const handleSave = useCallback(
    async (data: RoleFormData) => {
      if (state.status !== "ready" || isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        await handleSubmit(data);
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [handleSubmit, state],
  );

  return {
    state,
    canReadUsers,
    isSaving,
    handleCancel,
    handleSave,
  };
}
