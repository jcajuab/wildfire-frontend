"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import {
  IconDotsVertical,
  IconCircle,
  IconEdit,
  IconTrash,
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
  IconAdjustmentsHorizontal,
  IconUser,
  IconCheck,
} from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/formatters";
import type { User, UserRole, UserSort, UserSortField } from "@/types/user";

interface UsersTableProps {
  readonly users: readonly User[];
  readonly availableRoles: readonly UserRole[];
  readonly userRolesByUserId: Readonly<Record<string, readonly UserRole[]>>;
  readonly sort: UserSort;
  readonly onSortChange: (sort: UserSort) => void;
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (userId: string, roleIds: string[]) => void;
  readonly onRemoveUser: (user: User) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
  /** When true, allow update/delete for Super Admin users. When false, hide actions for users who have a system role. */
  readonly isSuperAdmin?: boolean;
  /** Role ids that are system roles (e.g. Super Admin). Used with isSuperAdmin to hide actions per row. */
  readonly systemRoleIds?: readonly string[];
  /** When set, the row for this user id will show " (You)" after the name. */
  readonly currentUserId?: string | null;
}

interface SortableHeaderProps {
  readonly label: string;
  readonly field: UserSortField;
  readonly currentSort: UserSort;
  readonly onSortChange: (sort: UserSort) => void;
}

function SortableHeader({
  label,
  field,
  currentSort,
  onSortChange,
}: SortableHeaderProps): ReactElement {
  const isActive = currentSort.field === field;
  const isAsc = currentSort.direction === "asc";

  const handleClick = (): void => {
    if (isActive) {
      onSortChange({ field, direction: isAsc ? "desc" : "asc" });
    } else {
      onSortChange({ field, direction: "asc" });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {isActive ? (
        isAsc ? (
          <IconSortAscending className="size-4" />
        ) : (
          <IconSortDescending className="size-4" />
        )
      ) : (
        <IconArrowsSort className="size-4 opacity-50" />
      )}
    </button>
  );
}

interface FilterableHeaderProps {
  readonly label: string;
}

function FilterableHeader({ label }: FilterableHeaderProps): ReactElement {
  return (
    <div className="flex items-center gap-1">
      {label}
      <IconAdjustmentsHorizontal className="size-4 opacity-50" />
    </div>
  );
}

interface UserActionsMenuProps {
  readonly user: User;
  readonly userRoleIds: string[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (userId: string, roleIds: string[]) => void;
  readonly onRemoveUser: (user: User) => void;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

function UserActionsMenu({
  user,
  userRoleIds,
  availableRoles,
  onEdit,
  onRoleToggle,
  onRemoveUser,
  canUpdate,
  canDelete,
}: UserActionsMenuProps): ReactElement | null {
  if (!canUpdate && !canDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <IconDotsVertical className="size-4" />
          <span className="sr-only">Actions</span>
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
          </>
        )}
        {canDelete && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onRemoveUser(user)}
          >
            <IconTrash className="size-4" />
            Remove User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface UserRowProps {
  readonly user: User;
  readonly userRoles: readonly UserRole[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (userId: string, roleIds: string[]) => void;
  readonly onRemoveUser: (user: User) => void;
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
  onRemoveUser,
  canUpdate,
  canDelete,
  currentUserId,
}: UserRowProps): ReactElement {
  const userRoleIds = userRoles.map((r) => r.id);
  const isCurrentUser = currentUserId != null && user.id === currentUserId;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt="User Avatar"
              width={48}
              height={48}
              className="size-7 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <IconUser className="size-6 text-muted-foreground" />
          )}
          <span className="font-medium">
            {user.name}
            {isCurrentUser && (
              <span className="text-muted-foreground font-normal"> (You)</span>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {userRoles.length === 0 && (
            <span className="text-muted-foreground">No roles assigned yet</span>
          )}
          {userRoles.map((role) => (
            <Badge key={role.id} variant="default" className="text-xs">
              {role.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "Never"}
      </TableCell>
      <TableCell>
        <UserActionsMenu
          user={user}
          userRoleIds={userRoleIds}
          availableRoles={availableRoles}
          onEdit={onEdit}
          onRoleToggle={onRoleToggle}
          onRemoveUser={onRemoveUser}
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
  onRemoveUser,
  canUpdate = true,
  canDelete = true,
  isSuperAdmin = false,
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
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">
            <SortableHeader
              label="Name"
              field="name"
              currentSort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[250px]">
            <FilterableHeader label="Email" />
          </TableHead>
          <TableHead className="w-[200px]">
            <FilterableHeader label="Roles" />
          </TableHead>
          <TableHead className="w-[200px]">
            <SortableHeader
              label="Last Seen"
              field="lastSeen"
              currentSort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const userRoleIds = (userRolesByUserId[user.id] ?? []).map(
            (r) => r.id,
          );
          const isTargetSuperAdmin =
            systemRoleIds.length > 0 &&
            userRoleIds.some((id) => systemRoleIds.includes(id));
          const canUpdateRow =
            canUpdate && (isSuperAdmin || !isTargetSuperAdmin);
          const canDeleteRow =
            canDelete &&
            (isSuperAdmin || !isTargetSuperAdmin) &&
            (currentUserId == null || user.id !== currentUserId);
          return (
            <UserRow
              key={user.id}
              user={user}
              userRoles={userRolesByUserId[user.id] ?? []}
              availableRoles={availableRoles}
              onEdit={onEdit}
              onRoleToggle={onRoleToggle}
              onRemoveUser={onRemoveUser}
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
