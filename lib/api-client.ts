import {
  getBaseUrl as getApiBaseUrl,
  getDevOnlyRequestHeaders,
} from "@/lib/api/base-query";
import type {
  ApiErrorResponse,
  AuthResponse,
  LoginCredentials,
} from "@/types/auth";
import type { InvitationRecord } from "@/types/invitation";

function getBaseUrl(): string {
  const url = getApiBaseUrl();
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return url;
}

/** POST /auth/login. Returns auth payload or throws with backend error body. */
export async function login(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(credentials),
  });

  const data = (await response.json()) as AuthResponse | ApiErrorResponse;

  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as AuthResponse;
}

/** GET /auth/session. Refreshes JWT (sliding session). Returns auth payload or throws with backend error body. */
export async function refreshToken(
  token?: string | null,
): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    ...getDevOnlyRequestHeaders(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/auth/session`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  const data = (await response.json()) as AuthResponse | ApiErrorResponse;

  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as AuthResponse;
}

/** POST /auth/logout. No-op on backend; call for consistency. Does not throw. */
export async function logoutApi(token?: string | null): Promise<void> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    ...getDevOnlyRequestHeaders(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    // Log for observability; do not throw so UX is not blocked
    console.warn("[auth] logout request failed", {
      route: "/auth/logout",
      status: response.status,
    });
  }
}

/** PATCH /auth/profile. Update current user profile (e.g. name, timezone). Returns full auth payload; use it to refresh session. */
export async function updateCurrentUserProfile(
  token: string | null | undefined,
  payload: { name?: string; timezone?: string | null },
): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getDevOnlyRequestHeaders(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/auth/profile`, {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as AuthResponse | ApiErrorResponse;

  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as AuthResponse;
}

/** POST /auth/password/change. Change current user password. Returns 204 on success; 401 if current password wrong. */
export async function changePassword(
  token: string | null | undefined,
  payload: { currentPassword: string; newPassword: string },
): Promise<void> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getDevOnlyRequestHeaders(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/auth/password/change`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 204) return;

  const data = (await response.json()) as ApiErrorResponse;
  const message =
    data?.error?.message ?? `Request failed with status ${response.status}`;
  throw new AuthApiError(message, response.status, data);
}

const AVATAR_UPLOAD_TIMEOUT_MS = 30_000;

/** PUT /auth/me/avatar. Upload or replace current user avatar. Returns full auth payload; use updateSession to refresh. */
export async function uploadAvatar(
  token: string | null | undefined,
  file: File,
): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AVATAR_UPLOAD_TIMEOUT_MS,
  );

  try {
    const headers: Record<string, string> = {
      ...getDevOnlyRequestHeaders(),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}/auth/me/avatar`, {
      method: "PUT",
      credentials: "include",
      headers,
      body: formData,
      signal: controller.signal,
    });

    const data = (await response.json()) as AuthResponse | ApiErrorResponse;

    if (!response.ok) {
      const error = data as ApiErrorResponse;
      const message =
        error?.error?.message ??
        `Request failed with status ${response.status}`;
      throw new AuthApiError(message, response.status, error);
    }

    return data as AuthResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** DELETE /auth/profile. Deletes the current user (self-deletion). Returns on 204; throws AuthApiError on error. */
export async function deleteCurrentUser(token?: string | null): Promise<void> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    ...getDevOnlyRequestHeaders(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/auth/profile`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });

  if (response.status === 204) return;

  const data = (await response.json()) as ApiErrorResponse;
  const message =
    data?.error?.message ?? `Request failed with status ${response.status}`;
  throw new AuthApiError(message, response.status, data);
}

/** POST /auth/password/forgot. Always returns 204 when accepted. */
export async function forgotPassword(email: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/password/forgot`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify({ email }),
  });

  if (response.status === 204) return;

  const data = (await response.json()) as ApiErrorResponse;
  const message =
    data?.error?.message ?? `Request failed with status ${response.status}`;
  throw new AuthApiError(message, response.status, data);
}

/** POST /auth/password/reset. Returns 204 on success. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/password/reset`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify({ token, newPassword }),
  });

  if (response.status === 204) return;

  const data = (await response.json()) as ApiErrorResponse;
  const message =
    data?.error?.message ?? `Request failed with status ${response.status}`;
  throw new AuthApiError(message, response.status, data);
}

export interface CreateInvitationResponse {
  readonly id: string;
  readonly expiresAt: string;
  readonly inviteUrl?: string;
}

export interface DeviceRuntimeSettingsResponse {
  readonly scrollPxPerSecond: number;
}

/** GET /settings/device-runtime. Requires settings:read permission. */
export async function getDeviceRuntimeSettings(): Promise<DeviceRuntimeSettingsResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/settings/device-runtime`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });
  const data = (await response.json()) as
    | DeviceRuntimeSettingsResponse
    | ApiErrorResponse;
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }
  return data as DeviceRuntimeSettingsResponse;
}

/** PATCH /settings/device-runtime. Requires settings:update permission. */
export async function updateDeviceRuntimeSettings(payload: {
  scrollPxPerSecond: number;
}): Promise<DeviceRuntimeSettingsResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/settings/device-runtime`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as
    | DeviceRuntimeSettingsResponse
    | ApiErrorResponse;
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }
  return data as DeviceRuntimeSettingsResponse;
}

/** POST /auth/invitations. Requires users:create permission. */
export async function createInvitation(input: {
  email: string;
  name?: string;
}): Promise<CreateInvitationResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/invitations`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as
    | CreateInvitationResponse
    | ApiErrorResponse;
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as CreateInvitationResponse;
}

/** GET /auth/invitations. Returns recent invitation records. */
export async function getInvitations(): Promise<readonly InvitationRecord[]> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/invitations`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });

  const data = (await response.json()) as
    | readonly InvitationRecord[]
    | ApiErrorResponse;
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as readonly InvitationRecord[];
}

/** POST /auth/invitations/:id/resend. */
export async function resendInvitation(
  id: string,
): Promise<CreateInvitationResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/invitations/${id}/resend`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });

  const data = (await response.json()) as
    | CreateInvitationResponse
    | ApiErrorResponse;
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    const message =
      error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status, error);
  }

  return data as CreateInvitationResponse;
}

/** POST /auth/invitations/accept. Returns 204 on success. */
export async function acceptInvitation(input: {
  token: string;
  password: string;
  name?: string;
}): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/invitations/accept`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (response.status === 204) return;

  const data = (await response.json()) as ApiErrorResponse;
  const message =
    data?.error?.message ?? `Request failed with status ${response.status}`;
  throw new AuthApiError(message, response.status, data);
}

/** Error thrown by auth API with status and optional backend body. */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}
