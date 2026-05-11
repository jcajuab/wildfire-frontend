"use client";

import type { ReactElement } from "react";
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";

import { SortableHeader } from "@/components/common/sortable-header";
import { TableEmptyState } from "@/components/common/table-empty-state";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, RoleSort } from "@/types/role";

interface RolesTableProps {
  readonly roles: readonly Role[];
  readonly sort: RoleSort;
  readonly onSortChange: (sort: RoleSort) => void;
  readonly onEdit: (role: Role) => void;
  readonly onDelete: (role: Role) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
  readonly deleteLabel?: string;
  readonly getDeleteLabel?: (role: Role) => string;
  readonly isDeleteDisabled?: (role: Role) => boolean;
  readonly emptyState?: {
    readonly title: string;
    readonly description: string;
    readonly action?: ReactElement | null;
  };
}

interface RoleActionsMenuProps {
  readonly role: Role;
  readonly onEdit: (role: Role) => void;
  readonly onDelete: (role: Role) => void;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly deleteLabel: string;
  readonly deleteDisabled?: boolean;
}

function RoleActionsMenu({
  role,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  deleteLabel,
  deleteDisabled = false,
}: RoleActionsMenuProps): ReactElement | null {
  if (!canEdit && !canDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${role.name}`}
        >
          <IconDotsVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(role)}>
            <IconEdit className="size-4" />
            Edit Role
          </DropdownMenuItem>
        )}
        {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
        {canDelete && (
          <DropdownMenuItem
            variant={deleteDisabled ? "default" : "destructive"}
            onClick={() => {
              if (deleteDisabled) return;
              onDelete(role);
            }}
            disabled={deleteDisabled}
            className={
              deleteDisabled
                ? "text-muted-foreground focus:text-muted-foreground"
                : undefined
            }
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
  getDeleteLabel,
  isDeleteDisabled,
  emptyState = {
    title: "No roles found",
    description:
      "Create role templates to standardize access control across your team.",
  },
}: RolesTableProps): ReactElement {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead
            className="w-[260px]"
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
          <TableHead>Description</TableHead>
          <TableHead
            className="w-[140px] text-center"
            aria-sort={
              sort.field === "usersCount"
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
          >
            <SortableHeader
              label="Users"
              field="usersCount"
              align="center"
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
        {roles.length === 0 ? (
          <TableEmptyState
            colSpan={4}
            title={emptyState.title}
            description={emptyState.description}
            action={emptyState.action}
            icon={<IconUsers className="size-7" aria-hidden="true" />}
          />
        ) : null}
        {roles.map((role) => (
          <TableRow key={role.id} className="h-12">
            <TableCell>
              <div className="flex min-h-8 min-w-0 items-center">
                <span className="block min-w-0 truncate font-medium">
                  {role.name}
                </span>
              </div>
            </TableCell>
            <TableCell className="max-w-[40rem] truncate text-muted-foreground">
              {role.description ?? "No description available"}
            </TableCell>
            <TableCell className="text-center text-muted-foreground tabular-nums">
              {role.usersCount ?? "—"}
            </TableCell>
            <TableCell className="w-[48px] text-right">
              <RoleActionsMenu
                role={role}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit && !role.isSystem}
                canDelete={canDelete && !role.isSystem}
                deleteLabel={getDeleteLabel?.(role) ?? deleteLabel}
                deleteDisabled={isDeleteDisabled?.(role) ?? false}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
