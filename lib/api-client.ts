import {
  getBaseUrl as getApiBaseUrl,
  getDevOnlyRequestHeaders,
} from "@/lib/api/base-query";
import {
  extractApiError,
  parseApiListResponseDataSafe,
  parseApiResponseData,
} from "@/lib/api/contracts";
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

async function readJsonPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function createAuthApiError(
  response: Response,
  payload: unknown,
): AuthApiError {
  const parsedError = extractApiError(payload) ?? undefined;
  const message =
    parsedError?.error?.message ??
    `Request failed with status ${response.status}`;
  return new AuthApiError(message, response.status, parsedError);
}

async function parseApiPayload<T>(response: Response): Promise<T> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  return parseApiResponseData<T>(payload);
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

  return parseApiPayload<AuthResponse>(response);
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

  return parseApiPayload<AuthResponse>(response);
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

  return parseApiPayload<AuthResponse>(response);
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

  const payloadData = await readJsonPayload(response);
  throw createAuthApiError(response, payloadData);
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

    return parseApiPayload<AuthResponse>(response);
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

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
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

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
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

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

export interface CreateInvitationResponse {
  readonly id: string;
  readonly expiresAt: string;
  readonly inviteUrl?: string;
}

export interface DeviceRuntimeSettingsResponse {
  readonly scrollPxPerSecond: number;
}

/** GET /settings/display-runtime. Requires settings:read permission. */
export async function getDeviceRuntimeSettings(): Promise<DeviceRuntimeSettingsResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/settings/display-runtime`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });
  return parseApiPayload<DeviceRuntimeSettingsResponse>(response);
}

/** PATCH /settings/display-runtime. Requires settings:update permission. */
export async function updateDeviceRuntimeSettings(payload: {
  scrollPxPerSecond: number;
}): Promise<DeviceRuntimeSettingsResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/settings/display-runtime`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseApiPayload<DeviceRuntimeSettingsResponse>(response);
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

  return parseApiPayload<CreateInvitationResponse>(response);
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

  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  return parseApiListResponseDataSafe<InvitationRecord>(
    payload,
    "getInvitations",
  );
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

  return parseApiPayload<CreateInvitationResponse>(response);
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

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
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
