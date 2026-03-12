"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  AuthApiError,
  createInvitation,
  type CreateInvitationResponse,
  getInvitations,
  resendInvitation,
  banUser,
  unbanUser,
  adminResetPassword,
} from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useUpdateUserMutation,
  useSetUserRolesMutation,
} from "@/lib/api/rbac-api";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import type { User, UserRole } from "@/types/user";
import type { InvitationRecord } from "@/types/invitation";

export function useUsersHandlers({
  canCreateUser,
  isAdmin,
  systemRoleIds,
  userRolesByUserId,
  setInvitations,
  setIsEditDialogOpen,
  setSelectedUser,
  setResetPasswordResult,
  setIsResetPasswordDialogOpen,
}: {
  canCreateUser: boolean;
  isAdmin: boolean;
  systemRoleIds: readonly string[];
  userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  setInvitations: (invitations: readonly InvitationRecord[]) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setSelectedUser: (user: User | null) => void;
  setResetPasswordResult: (
    result: { userId: string; password: string } | null,
  ) => void;
  setIsResetPasswordDialogOpen: (open: boolean) => void;
}) {
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(false);
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);

  const [updateUser] = useUpdateUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();

  const loadInvitations = useCallback(async (): Promise<void> => {
    if (!canCreateUser) {
      setInvitations([]);
      return;
    }

    setIsInvitationsLoading(true);
    try {
      const list = await getInvitations();
      setInvitations(list);
    } catch (err) {
      notifyApiError(err, "Failed to load invitations");
    } finally {
      setIsInvitationsLoading(false);
    }
  }, [canCreateUser, setInvitations]);

  const handleInvite = useCallback(
    async (emails: readonly string[]): Promise<string | null> => {
      try {
        const results = await Promise.allSettled(
          emails.map((email) => createInvitation({ email })),
        );

        const failedInvites = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        if (failedInvites.length > 0) {
          const firstError = failedInvites[0]?.reason;
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
        const inviteUrl = firstSuccess?.value.inviteUrl ?? null;

        const latestInvitations = await getInvitations();
        setInvitations(latestInvitations);

        return inviteUrl;
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
    [setInvitations],
  );

  const handleResendInvitation = useCallback(
    async (id: string) => {
      setResendingInvitationId(id);
      try {
        await resendInvitation(id);
        toast.success("Invitation link regenerated.");
        const latestInvitations = await getInvitations();
        setInvitations(latestInvitations);
      } catch (err) {
        notifyApiError(err, "Failed to regenerate invite link");
      } finally {
        setResendingInvitationId(null);
      }
    },
    [setInvitations],
  );

  const applyUserRoles = useCallback(
    async (payload: { userId: string; roleIds: string[] }): Promise<void> => {
      await setUserRoles(payload).unwrap();
    },
    [setUserRoles],
  );

  const handleRoleToggle = useCallback(
    (userId: string, newRoleIds: string[]) => {
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

      void applyUserRoles({
        userId,
        roleIds: roleIdsToSend,
      }).catch((err) => {
        notifyApiError(err, "Failed to update user roles");
      });
    },
    [applyUserRoles, isAdmin, systemRoleIds, userRolesByUserId],
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
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (err) {
        notifyApiError(err, "Failed to update user");
      }
    },
    [updateUser, setIsEditDialogOpen, setSelectedUser],
  );

  const banUserById = useCallback(async (id: string) => {
    await banUser(id);
  }, []);

  const unbanUserById = useCallback(async (id: string) => {
    await unbanUser(id);
  }, []);

  const handleResetPassword = useCallback(
    async (userId: string) => {
      try {
        const result = await adminResetPassword(userId);
        setResetPasswordResult({ userId, password: result.password });
        setIsResetPasswordDialogOpen(true);
      } catch (err) {
        notifyApiError(err, "Failed to reset password");
      }
    },
    [setResetPasswordResult, setIsResetPasswordDialogOpen],
  );

  return {
    isInvitationsLoading,
    resendingInvitationId,
    loadInvitations,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEditSubmit,
    banUserById,
    unbanUserById,
    handleResetPassword,
  };
}
