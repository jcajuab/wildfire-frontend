"use client";

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
}: SortableHeaderProps): React.ReactElement {
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

function FilterableHeader({
  label,
}: FilterableHeaderProps): React.ReactElement {
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
}

function UserActionsMenu({
  user,
  userRoleIds,
  availableRoles,
  onEdit,
  onRoleToggle,
  onRemoveUser,
}: UserActionsMenuProps): React.ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <IconDotsVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
        <DropdownMenuItem
          onClick={() => onRemoveUser(user)}
          className="text-destructive focus:text-destructive"
        >
          <IconTrash className="size-4" />
          Remove User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatLastSeen(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${year}-${month}-${day}, ${String(hour12).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
}

interface UserRowProps {
  readonly user: User;
  readonly userRoles: readonly UserRole[];
  readonly availableRoles: readonly UserRole[];
  readonly onEdit: (user: User) => void;
  readonly onRoleToggle: (userId: string, roleIds: string[]) => void;
  readonly onRemoveUser: (user: User) => void;
}

function UserRow({
  user,
  userRoles,
  availableRoles,
  onEdit,
  onRoleToggle,
  onRemoveUser,
}: UserRowProps): React.ReactElement {
  const userRoleIds = userRoles.map((r) => r.id);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <IconUser className="size-4 text-muted-foreground" />
          <span className="font-medium">{user.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {userRoles.map((role) => (
            <Badge key={role.id} variant="default" className="text-xs">
              {role.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatLastSeen(user.lastSeenAt ?? null)}
      </TableCell>
      <TableCell>
        <UserActionsMenu
          user={user}
          userRoleIds={userRoleIds}
          availableRoles={availableRoles}
          onEdit={onEdit}
          onRoleToggle={onRoleToggle}
          onRemoveUser={onRemoveUser}
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
}: UsersTableProps): React.ReactElement {
  if (users.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">No users found</p>
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
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            userRoles={userRolesByUserId[user.id] ?? []}
            availableRoles={availableRoles}
            onEdit={onEdit}
            onRoleToggle={onRoleToggle}
            onRemoveUser={onRemoveUser}
          />
        ))}
      </TableBody>
    </Table>
  );
}
