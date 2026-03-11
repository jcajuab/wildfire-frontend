"use client";

import type { ReactElement } from "react";
import {
  IconDotsVertical,
  IconCircle,
  IconEdit,
  IconBan,
  IconCircleCheck,
  IconKey,
  IconCheck,
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
import type { User, UserRole } from "@/types/user";

export interface UserActionsMenuProps {
  readonly user: User;
  readonly userRoleIds: string[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (userId: string, roleIds: string[]) => void;
  readonly onBanUser: (user: User) => void;
  readonly onUnbanUser: (user: User) => void;
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
  onResetPassword,
  canUpdate,
  canDelete,
}: UserActionsMenuProps): ReactElement | null {
  if (!canUpdate && !canDelete) return null;

  const isBanned = Boolean(user.bannedAt);
  const isInvitedUser = user.isInvitedUser === true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${user.name}`}
        >
          <IconDotsVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && (
          <>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <IconEdit className="size-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <IconCircle className="size-4" />
                Roles
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableRoles.map((role) => {
                  const isChecked = userRoleIds.includes(role.id);
                  return (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={(e) => {
                        e.preventDefault();
                        const newRoleIds = isChecked
                          ? userRoleIds.filter((id) => id !== role.id)
                          : [...userRoleIds, role.id];
                        onRoleToggle(user.id, newRoleIds);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{role.name}</span>
                      {isChecked && <IconCheck className="size-4" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {isInvitedUser && (
              <DropdownMenuItem onClick={() => void onResetPassword(user.id)}>
                <IconKey className="size-4" />
                Reset Password
              </DropdownMenuItem>
            )}
          </>
        )}
        {canDelete && (
          <>
            {canUpdate && <DropdownMenuSeparator />}
            {isBanned ? (
              <DropdownMenuItem onClick={() => onUnbanUser(user)}>
                <IconCircleCheck className="size-4" />
                Unban User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onBanUser(user)}
              >
                <IconBan className="size-4" />
                Ban User
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
