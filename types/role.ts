import type { PermissionAction, PermissionResource } from "@/types/permission";

/** Permission shape aligned with backend (resource:action). */
export interface Permission {
  readonly id: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

/** User assigned to a role (for dialog display). */
export interface RoleUser {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly email: string | null;
}

/** Role list/detail shape aligned with backend. */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  /** Present when list includes user count (e.g. from API or derived). */
  readonly usersCount?: number;
}

import type { SortDirection } from "@/types/common";

export type RoleSortField = "name" | "usersCount";

export interface RoleSort {
  readonly field: RoleSortField;
  readonly direction: SortDirection;
}

export interface RoleFormData {
  readonly name: string;
  readonly description?: string | null;
  readonly permissionIds: readonly string[];
  readonly userIds: readonly string[];
}
