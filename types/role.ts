/** Permission shape aligned with backend (resource:action). */
export interface Permission {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
}

/** User assigned to a role (for dialog display). */
export interface RoleUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
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

export type RoleSortField = "name" | "usersCount";
export type RoleSortDirection = "asc" | "desc";

export interface RoleSort {
  readonly field: RoleSortField;
  readonly direction: RoleSortDirection;
}

export interface RoleFormData {
  readonly name: string;
  readonly description?: string | null;
  readonly permissionIds: readonly string[];
  readonly userIds: readonly string[];
  readonly policyVersion?: number;
  readonly highRiskConfirmed?: boolean;
}
