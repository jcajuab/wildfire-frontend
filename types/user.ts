export interface UserRole {
  readonly id: string;
  readonly name: string;
}

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly UserRole[];
  readonly lastSeenAt: string | null;
}

export type UserSortField = "name" | "lastSeen";
export type UserSortDirection = "asc" | "desc";

export interface UserSort {
  readonly field: UserSortField;
  readonly direction: UserSortDirection;
}
