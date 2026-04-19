"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
import { isNotFoundError } from "@/lib/api/error-guards";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { useGetRoleEditBootstrapQuery } from "@/lib/api/rbac-api";
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
    data: bootstrapData,
    error: bootstrapError,
    isLoading: bootstrapLoading,
    isFetching: bootstrapFetching,
  } = useGetRoleEditBootstrapQuery(resolvedRoleId, {
    skip: !hasRoleId,
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

    if (bootstrapLoading || bootstrapFetching) {
      return { status: "loading" };
    }

    const notFoundError = isNotFoundError(bootstrapError)
      ? bootstrapError
      : undefined;

    if (notFoundError !== undefined) {
      return {
        status: "notFound",
        message: getApiErrorMessage(
          notFoundError,
          "The requested role was not found.",
        ),
      };
    }

    const genericError = bootstrapError;

    if (genericError !== undefined) {
      return {
        status: "error",
        message: getApiErrorMessage(
          genericError,
          "Failed to load role details.",
        ),
      };
    }

    if (bootstrapData === undefined) {
      return { status: "loading" };
    }

    const role = toRole(bootstrapData.role);
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
      permissions: bootstrapData.permissions,
      initialPermissionIds: bootstrapData.rolePermissions.map(
        (permission) => permission.id,
      ),
      initialUsers: canReadUsers
        ? toRoleUsers(bootstrapData.roleUsers ?? [])
        : [],
    };
  }, [
    canReadUsers,
    hasRoleId,
    bootstrapData,
    bootstrapError,
    bootstrapFetching,
    bootstrapLoading,
  ]);

  const handleCancel = useCallback(() => {
    router.push(ROLE_INDEX_PATH);
  }, [router]);

  const { handleSubmit } = useRolesHandlers({
    mode: "edit",
    selectedRole: state.status === "ready" ? state.role : null,
    roleUsersData:
      canReadUsers && state.status === "ready" ? state.initialUsers : undefined,
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
