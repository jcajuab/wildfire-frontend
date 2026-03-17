"use client";

import { useCallback } from "react";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useSetRolePermissionsMutation,
  useSetUserRolesMutation,
  useUpdateRoleMutation,
  useLazyGetUserRolesQuery,
} from "@/lib/api/rbac-api";
import type { Role, RoleFormData } from "@/types/role";

export function useRolesHandlers({
  mode,
  selectedRole,
  roleUsersData,
  onSuccess,
}: {
  mode: "create" | "edit";
  selectedRole: Role | null;
  roleUsersData: readonly { id: string }[] | undefined;
  onSuccess?: () => void | Promise<void>;
}) {
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRoleMutation] = useDeleteRoleMutation();
  const [setRolePermissions] = useSetRolePermissionsMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
      try {
        if (mode === "create") {
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
          await onSuccess?.();
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
          await onSuccess?.();
        }
      } catch (err) {
        notifyApiError(err, "Something went wrong");
      }
    },
    [
      mode,
      selectedRole,
      roleUsersData,
      createRole,
      updateRole,
      setRolePermissions,
      setUserRoles,
      getUserRolesTrigger,
      onSuccess,
    ],
  );

  const deleteRole = useCallback(
    async (id: string) => {
      await deleteRoleMutation(id).unwrap();
    },
    [deleteRoleMutation],
  );

  return {
    handleSubmit,
    deleteRole,
  };
}
