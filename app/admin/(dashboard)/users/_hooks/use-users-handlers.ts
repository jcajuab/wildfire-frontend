"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useResetUserPasswordMutation,
  useSetUserStatusMutation,
  useUpdateUserMutation,
  useSetUserRolesMutation,
} from "@/lib/api/rbac-api";
import {
  useCreateInvitationMutation,
  type CreateInvitationResponse,
  useResendInvitationMutation,
} from "@/lib/api/invitations-api";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import type { User, UserRole } from "@/types/user";

export function useUsersHandlers({
  isAdmin,
  systemRoleIds,
  userRolesByUserId,
  setIsEditDialogOpen,
  setSelectedUser,
  setResetPasswordResult,
  setIsResetPasswordDialogOpen,
}: {
  isAdmin: boolean;
  systemRoleIds: readonly string[];
  userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  setIsEditDialogOpen: (open: boolean) => void;
  setSelectedUser: (user: User | null) => void;
  setResetPasswordResult: (
    result: { userId: string; password: string } | null,
  ) => void;
  setIsResetPasswordDialogOpen: (open: boolean) => void;
}) {
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);

  const [isRoleToggling, setIsRoleToggling] = useState(false);
  const [createInvitation] = useCreateInvitationMutation();
  const [resendInvitation] = useResendInvitationMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [setUserStatus] = useSetUserStatusMutation();
  const [resetUserPassword] = useResetUserPasswordMutation();

  const handleInvite = useCallback(
    async (
      emails: readonly string[],
    ): Promise<{ id: string; expiresAt: string } | null> => {
      try {
        const results = await Promise.allSettled(
          emails.map((email) => createInvitation({ email }).unwrap()),
        );

        const failedInvites = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        if (failedInvites.length > 0) {
          const firstError = failedInvites[0]?.reason;
          if (
            failedInvites.length === 1 &&
            emails.length === 1 &&
            firstError instanceof Error
          ) {
            throw firstError;
          }
          const details =
            firstError instanceof Error ? `: ${firstError.message}` : "";
          throw new Error(
            `${failedInvites.length} of ${emails.length} invites failed${details}`,
          );
        }

        const firstSuccess = results.find(
          (
            result,
          ): result is PromiseFulfilledResult<CreateInvitationResponse> =>
            result.status === "fulfilled",
        );

        return firstSuccess?.value ?? null;
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 429) {
          notifyApiError(
            err,
            "Too many invite requests. Please wait and try again.",
          );
          return null;
        }
        notifyApiError(err, "Failed to invite user(s)");
        return null;
      }
    },
    [createInvitation],
  );

  const handleResendInvitation = useCallback(
    async (id: string) => {
      setResendingInvitationId(id);
      try {
        await resendInvitation(id).unwrap();
        toast.success("Invitation link regenerated.");
      } catch (err) {
        notifyApiError(err, "Failed to regenerate invite link");
      } finally {
        setResendingInvitationId(null);
      }
    },
    [resendInvitation],
  );

  const handleRoleToggle = useCallback(
    async (userId: string, newRoleIds: string[]): Promise<string[]> => {
      setIsRoleToggling(true);
      try {
        const roleIdsToSend = isAdmin
          ? newRoleIds
          : (() => {
              const currentIds =
                userRolesByUserId[userId]?.map((r) => r.id) ?? [];
              const preservedSystem = currentIds.filter((id) =>
                systemRoleIds.includes(id),
              );
              return [...new Set([...newRoleIds, ...preservedSystem])];
            })();

        const confirmedRoles = await setUserRoles({
          userId,
          roleIds: roleIdsToSend,
        }).unwrap();
        return confirmedRoles.map((r) => r.id);
      } finally {
        setTimeout(() => setIsRoleToggling(false), 500);
      }
    },
    [setUserRoles, isAdmin, systemRoleIds, userRolesByUserId],
  );

  const handleEditSubmit = useCallback(
    async (data: EditUserFormData) => {
      try {
        await updateUser({
          id: data.id,
          username: data.username,
          name: data.name,
          email: data.email,
          isActive: data.isActive,
        }).unwrap();
        toast.success(`Successfully updated ${data.name}`);
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (err) {
        notifyApiError(err, `Failed to update ${data.name}`);
      }
    },
    [updateUser, setIsEditDialogOpen, setSelectedUser],
  );

  const banUserById = useCallback(
    async (id: string) => {
      await setUserStatus({ userId: id, banned: true }).unwrap();
    },
    [setUserStatus],
  );

  const unbanUserById = useCallback(
    async (id: string) => {
      await setUserStatus({ userId: id, banned: false }).unwrap();
    },
    [setUserStatus],
  );

  const handleResetPassword = useCallback(
    async (userId: string) => {
      try {
        const result = await resetUserPassword(userId).unwrap();
        setResetPasswordResult({ userId, password: result.password });
        setIsResetPasswordDialogOpen(true);
      } catch (err) {
        notifyApiError(err, "Failed to reset password");
      }
    },
    [resetUserPassword, setResetPasswordResult, setIsResetPasswordDialogOpen],
  );

  return {
    isRoleToggling,
    resendingInvitationId,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEditSubmit,
    banUserById,
    unbanUserById,
    handleResetPassword,
  };
}
