/** Role reference for display (e.g. on user row). */
export interface UserRole {
  readonly id: string;
  readonly name: string;
}

/** User shape aligned with backend. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly isActive: boolean;
  /** Presigned avatar URL (when user has profile picture in MinIO). */
  readonly avatarUrl?: string | null;
  /** Assigned roles (for display when loaded). */
  readonly roles?: readonly UserRole[];
  /** Last seen timestamp (optional; backend may not provide). */
  readonly lastSeenAt?: string | null;
}

export type UserSortField = "name" | "lastSeen";
export type UserSortDirection = "asc" | "desc";

export interface UserSort {
  readonly field: UserSortField;
  readonly direction: UserSortDirection;
}
