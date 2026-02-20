"use client";

import type { ReactElement } from "react";
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
  IconUsers,
} from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, RoleSort, RoleSortField } from "@/types/role";

interface RolesTableProps {
  readonly roles: readonly Role[];
  readonly sort: RoleSort;
  readonly onSortChange: (sort: RoleSort) => void;
  readonly onEdit: (role: Role) => void;
  readonly onDelete: (role: Role) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
  readonly deleteLabel?: string;
  /** When false, the 3-dot menu is hidden for system roles (e.g. Super Admin). */
  readonly isSuperAdmin?: boolean;
}

interface SortableHeaderProps {
  readonly label: string;
  readonly field: RoleSortField;
  readonly currentSort: RoleSort;
  readonly onSortChange: (sort: RoleSort) => void;
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
        <IconArrowsSort className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}

interface RoleActionsMenuProps {
  readonly role: Role;
  readonly onEdit: (role: Role) => void;
  readonly onDelete: (role: Role) => void;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly deleteLabel: string;
}

function RoleActionsMenu({
  role,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  deleteLabel,
}: RoleActionsMenuProps): ReactElement | null {
  if (!canEdit && !canDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <IconDotsVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(role)}>
            <IconEdit className="size-4" />
            Edit Role
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(role)}
            className="text-destructive focus:text-destructive"
          >
            <IconTrash className="size-4" />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RolesTable({
  roles,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  deleteLabel = "Delete Role",
  isSuperAdmin = false,
}: RolesTableProps): ReactElement {
  if (roles.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No roles found"
          description="Create role templates to standardize access control across your team."
          icon={<IconUsers className="size-7" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortableHeader
              label="Roles"
              field="name"
              currentSort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[150px]">
            <SortableHeader
              label="Users"
              field="usersCount"
              currentSort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="font-medium">{role.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {role.description ?? "No description set for this role"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{role.usersCount ?? "—"}</span>
                <IconUsers className="size-4" />
              </div>
            </TableCell>
            <TableCell>
              <RoleActionsMenu
                role={role}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit && (isSuperAdmin || !role.isSystem)}
                canDelete={canDelete && (isSuperAdmin || !role.isSystem)}
                deleteLabel={deleteLabel}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
