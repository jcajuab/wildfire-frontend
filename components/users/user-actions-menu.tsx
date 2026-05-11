"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  IconDotsVertical,
  IconCircle,
  IconEdit,
  IconBan,
  IconCircleCheck,
  IconKey,
  IconCheck,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import type { User, UserRole } from "@/types/user";

export interface UserActionsMenuProps {
  readonly user: User;
  readonly userRoleIds: string[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (
    userId: string,
    roleIds: string[],
  ) => Promise<string[]>;
  readonly onBanUser: (user: User) => void;
  readonly onUnbanUser: (user: User) => void;
  readonly onDeleteUser: (user: User) => void;
  readonly onResetPassword: (userId: string) => Promise<void>;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function UserActionsMenu({
  user,
  userRoleIds,
  availableRoles,
  onEdit,
  onRoleToggle,
  onBanUser,
  onUnbanUser,
  onDeleteUser,
  onResetPassword,
  canUpdate,
  canDelete,
}: UserActionsMenuProps): ReactElement | null {
  const [loadingRoleId, setLoadingRoleId] = useState<string | null>(null);
  // Server-confirmed role IDs — set from the mutation response so the UI
  // reflects the server's truth immediately, before RTK Query refetch lands.
  const [confirmedRoleIds, setConfirmedRoleIds] = useState<string[] | null>(
    null,
  );

  // Use server-confirmed state if available, otherwise fall back to props.
  const effectiveRoleIds = confirmedRoleIds ?? userRoleIds;

  if (!canUpdate && !canDelete) return null;

  const isBanned = Boolean(user.bannedAt);
  const isInvitedUser = user.isInvitedUser === true;
  const showResetPassword = canUpdate && isInvitedUser;
  const showRoles = canUpdate;
  const showStatus = canDelete;
  const showDelete = canDelete && isInvitedUser;
  const showDestructiveGroup = showStatus || showDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${user.name}`}
        >
          <IconDotsVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canUpdate && (
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <IconEdit className="size-4" aria-hidden="true" />
            Edit User
          </DropdownMenuItem>
        )}
        {showResetPassword ? (
          <DropdownMenuItem onClick={() => void onResetPassword(user.id)}>
            <IconKey className="size-4" aria-hidden="true" />
            Reset Password
          </DropdownMenuItem>
        ) : null}
        {showRoles ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <IconCircle className="size-4" aria-hidden="true" />
                Roles
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent sideOffset={8} className="min-w-52">
                {availableRoles.map((role) => {
                  const isChecked = effectiveRoleIds.includes(role.id);
                  const isLoading = loadingRoleId === role.id;
                  return (
                    <DropdownMenuItem
                      key={role.id}
                      disabled={isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        if (loadingRoleId != null) return;
                        const newRoleIds = isChecked
                          ? effectiveRoleIds.filter((id) => id !== role.id)
                          : [...effectiveRoleIds, role.id];

                        // Show spinner only — no checkmark change until server confirms.
                        setLoadingRoleId(role.id);

                        onRoleToggle(user.id, newRoleIds)
                          .then((serverRoleIds) => {
                            // Batch: confirmed roles + clear spinner + toast — single re-render.
                            setConfirmedRoleIds(serverRoleIds);
                            setLoadingRoleId(null);
                            toast.success(
                              `Successfully updated ${user.name}'s roles`,
                            );
                          })
                          .catch((err) => {
                            // Batch: clear spinner + error toast — no state change to roles.
                            setLoadingRoleId(null);
                            notifyApiError(err, "Failed to update user roles");
                          });
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{role.name}</span>
                      {isLoading ? (
                        <IconLoader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        isChecked && (
                          <IconCheck className="size-4" aria-hidden="true" />
                        )
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        ) : null}
        {showDestructiveGroup ? (
          <>
            {(canUpdate || showResetPassword || showRoles) && (
              <DropdownMenuSeparator />
            )}
            {showStatus && isBanned ? (
              <DropdownMenuItem onClick={() => onUnbanUser(user)}>
                <IconCircleCheck className="size-4" aria-hidden="true" />
                Unban User
              </DropdownMenuItem>
            ) : null}
            {showStatus && !isBanned ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onBanUser(user)}
              >
                <IconBan className="size-4" aria-hidden="true" />
                Ban User
              </DropdownMenuItem>
            ) : null}
            {showDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeleteUser(user)}
              >
                <IconTrash className="size-4" aria-hidden="true" />
                Delete User
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
