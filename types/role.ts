export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface RoleUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: readonly Permission[];
  readonly users: readonly RoleUser[];
  readonly usersCount: number;
}

export type RoleSortField = "name" | "usersCount";
export type RoleSortDirection = "asc" | "desc";

export interface RoleSort {
  readonly field: RoleSortField;
  readonly direction: RoleSortDirection;
}

export interface RoleFormData {
  readonly name: string;
  readonly permissionIds: readonly string[];
  readonly userIds: readonly string[];
}
