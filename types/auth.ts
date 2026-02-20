/** Login request body (POST /auth/login). */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/** User shape returned by auth endpoints. */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly timezone?: string | null;
  readonly avatarUrl?: string | null;
}

/** Success response from POST /auth/login and GET /auth/session. */
export interface AuthResponse {
  readonly type: "bearer";
  readonly token: string;
  readonly expiresAt: string;
  readonly user: AuthUser;
  /** Current user's permissions (resource:action). Empty if no roles. */
  readonly permissions: string[];
}

/** Backend error response shape. */
export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}
