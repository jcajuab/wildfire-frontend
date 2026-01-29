export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
  readonly usersCount: number;
  readonly createdAt: string;
}

export type RoleSortField = "name" | "usersCount" | "createdAt";
export type RoleSortDirection = "asc" | "desc";

export interface RoleSort {
  readonly field: RoleSortField;
  readonly direction: RoleSortDirection;
}

export interface CreateRoleFormData {
  readonly name: string;
  readonly description: string;
  readonly permissionIds: readonly string[];
}

export interface EditRoleFormData {
  readonly name: string;
  readonly description: string;
  readonly permissionIds: readonly string[];
}
