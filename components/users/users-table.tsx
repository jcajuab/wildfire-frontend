"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { IconFilter, IconUser } from "@tabler/icons-react";
import { UserActionsMenu } from "./user-actions-menu";

import { EmptyState } from "@/components/common/empty-state";
import { SortableHeader } from "@/components/common/sortable-header";
import { TableHeaderControl } from "@/components/common/table-header-control";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import type { User, UserRole, UserSort } from "@/types/user";

interface UsersTableProps {
  readonly users: readonly User[];
  readonly availableRoles: readonly UserRole[];
  readonly userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  readonly sort: UserSort;
  readonly onSortChange: (sort: UserSort) => void;
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (
    userId: string,
    roleIds: string[],
  ) => Promise<string[]>;
  readonly onBanUser: (user: User) => void;
  readonly onUnbanUser: (user: User) => void;
  readonly onResetPassword: (userId: string) => Promise<void>;
  readonly roleFilter?: string;
  readonly onRoleFilterChange?: (roleId: string) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
  /** When true, allow update/delete for Root users. When false, hide actions for users who have a system role. */
  readonly isSuperAdmin?: boolean;
  /** Role ids that are system roles (e.g. Root). Used with isSuperAdmin to hide actions per row. */
  readonly systemRoleIds?: readonly string[];
  /** When set, the row for this user id will show " (You)" after the name. */
  readonly currentUserId?: string | null;
}

function RoleFilterHeader({
  roles,
  value,
  onChange,
}: {
  readonly roles: readonly UserRole[];
  readonly value: string;
  readonly onChange: (roleId: string) => void;
}): ReactElement {
  const hasActiveFilter = value !== "all";
  const activeLabel = roles.find((role) => role.id === value)?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TableHeaderControl aria-label="Filter users by role">
          Roles
          <IconFilter
            className={
              hasActiveFilter
                ? "size-3.5 text-foreground"
                : "size-3.5 text-muted-foreground"
            }
            aria-hidden="true"
          />
          {activeLabel ? (
            <span className="sr-only">filtered by {activeLabel}</span>
          ) : null}
        </TableHeaderControl>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value="all">All roles</DropdownMenuRadioItem>
          {roles.map((role) => (
            <DropdownMenuRadioItem key={role.id} value={role.id}>
              {role.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface UserRowProps {
  readonly user: User;
  readonly userRoles: readonly UserRole[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (
    userId: string,
    roleIds: string[],
  ) => Promise<string[]>;
  readonly onBanUser: (user: User) => void;
  readonly onUnbanUser: (user: User) => void;
  readonly onResetPassword: (userId: string) => Promise<void>;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly currentUserId?: string | null;
}

function UserRow({
  user,
  userRoles,
  availableRoles,
  onEdit,
  onRoleToggle,
  onBanUser,
  onUnbanUser,
  onResetPassword,
  canUpdate,
  canDelete,
  currentUserId,
}: UserRowProps): ReactElement {
  const userRoleIds = userRoles.map((r) => r.id);
  const isCurrentUser = currentUserId != null && user.id === currentUserId;
  const isBanned = Boolean(user.bannedAt);

  return (
    <TableRow className="h-12">
      <TableCell>
        <div className="flex min-h-8 min-w-0 items-center gap-2">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${user.name} avatar`}
              width={48}
              height={48}
              className="size-6 rounded-full object-cover"
            />
          ) : (
            <IconUser className="size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-h-8 min-w-0 flex-col justify-center">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">
                {user.name}
                {isCurrentUser && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    (You)
                  </span>
                )}
              </span>
              {isBanned && (
                <Badge
                  variant="destructive"
                  className="h-5 border-destructive/30 px-2 text-[0.625rem]"
                >
                  Banned
                </Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              @{user.username}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-[18rem] truncate text-muted-foreground">
        {user.email ?? "No email available"}
      </TableCell>
      <TableCell>
        <div className="flex max-w-[15rem] flex-nowrap gap-1 overflow-hidden">
          {userRoles.length === 0 && (
            <span className="truncate text-muted-foreground">
              No roles assigned yet
            </span>
          )}
          {userRoles.map((role) => (
            <Badge
              key={role.id}
              variant="outline"
              className="shrink-0 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {role.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "Never"}
      </TableCell>
      <TableCell className="w-[48px] text-right">
        <UserActionsMenu
          user={user}
          userRoleIds={userRoleIds}
          availableRoles={availableRoles}
          onEdit={onEdit}
          onRoleToggle={onRoleToggle}
          onBanUser={onBanUser}
          onUnbanUser={onUnbanUser}
          onResetPassword={onResetPassword}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </TableCell>
    </TableRow>
  );
}

export function UsersTable({
  users,
  availableRoles,
  userRolesByUserId,
  sort,
  onSortChange,
  onEdit,
  onRoleToggle,
  onBanUser,
  onUnbanUser,
  onResetPassword,
  roleFilter = "all",
  onRoleFilterChange,
  canUpdate = true,
  canDelete = true,
  systemRoleIds = [],
  currentUserId,
}: UsersTableProps): ReactElement {
  if (users.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No users found"
          description="Invite teammates to collaborate on content, playlists, and display operations."
          icon={<IconUser className="size-7" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead
            className="w-[300px]"
            aria-sort={
              sort.field === "name"
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
          >
            <SortableHeader
              label="Name"
              field="name"
              currentSort={sort}
              onSort={(field, direction) => onSortChange({ field, direction })}
            />
          </TableHead>
          <TableHead
            className="w-[300px]"
            aria-sort={
              sort.field === "email"
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
          >
            <SortableHeader
              label="Email"
              field="email"
              currentSort={sort}
              onSort={(field, direction) => onSortChange({ field, direction })}
            />
          </TableHead>
          <TableHead className="w-[240px]">
            {onRoleFilterChange ? (
              <RoleFilterHeader
                roles={availableRoles}
                value={roleFilter}
                onChange={onRoleFilterChange}
              />
            ) : (
              "Roles"
            )}
          </TableHead>
          <TableHead
            className="w-[240px]"
            aria-sort={
              sort.field === "lastSeen"
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
          >
            <SortableHeader
              label="Last Seen"
              field="lastSeen"
              currentSort={sort}
              onSort={(field, direction) => onSortChange({ field, direction })}
            />
          </TableHead>
          <TableHead className="w-[48px] text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-b">
        {users.map((user) => {
          const userRoleIds = (userRolesByUserId[user.id] ?? []).map(
            (r) => r.id,
          );
          const isTargetSuperAdmin =
            systemRoleIds.length > 0 &&
            userRoleIds.some((id) => systemRoleIds.includes(id));
          const canUpdateRow = canUpdate && !isTargetSuperAdmin;
          const canDeleteRow =
            canDelete &&
            !isTargetSuperAdmin &&
            (currentUserId == null || user.id !== currentUserId);
          return (
            <UserRow
              key={user.id}
              user={user}
              userRoles={userRolesByUserId[user.id] ?? []}
              availableRoles={availableRoles}
              onEdit={onEdit}
              onRoleToggle={onRoleToggle}
              onBanUser={onBanUser}
              onUnbanUser={onUnbanUser}
              onResetPassword={onResetPassword}
              canUpdate={canUpdateRow}
              canDelete={canDeleteRow}
              currentUserId={currentUserId}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}
