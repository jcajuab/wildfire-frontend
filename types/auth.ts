import type { PermissionType } from "@/types/permission";

/** Login request body (POST /auth/login). */
export interface LoginCredentials {
  readonly username: string;
  readonly password: string;
}

/** User shape returned by auth endpoints. */
export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly email: string | null;
  readonly name: string;
  readonly isAdmin: boolean;
  readonly isInvitedUser: boolean;
  readonly timezone: string | null;
  readonly avatarUrl: string | null;
}

export interface AuthSnapshot {
  readonly accessToken: string | null;
  readonly accessTokenExpiresAt: string | null;
  readonly user: AuthUser | null;
  readonly permissions: PermissionType[];
  readonly isBootstrapped: boolean;
}

/** Success response from POST /auth/login and POST /auth/refresh. */
export interface AuthResponse {
  readonly type: "bearer";
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly user: AuthUser;
  /** Current user's permissions (resource:action). Empty if no roles. */
  readonly permissions: PermissionType[];
}
