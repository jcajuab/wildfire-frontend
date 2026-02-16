import {
  getBaseUrl as getApiBaseUrl,
  getDevOnlyRequestHeaders,
} from "@/lib/api/base-query";
import type {
  ApiErrorResponse,
  AuthResponse,
  LoginCredentials,
} from "@/types/auth";

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

/** GET /auth/me. Refreshes JWT (sliding session). Returns auth payload or throws with backend error body. */
export async function refreshToken(token: string): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getDevOnlyRequestHeaders(),
    },
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
export async function logoutApi(token: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getDevOnlyRequestHeaders(),
    },
  });
  if (!response.ok) {
    // Log for observability; do not throw so UX is not blocked
    console.warn("[auth] logout request failed", {
      route: "/auth/logout",
      status: response.status,
    });
  }
}

/** PATCH /auth/me. Update current user profile (e.g. name, timezone). Returns full auth payload; use it to refresh session. */
export async function updateCurrentUserProfile(
  token: string,
  payload: { name?: string; timezone?: string | null },
): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getDevOnlyRequestHeaders(),
    },
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

/** POST /auth/me/password. Change current user password. Returns 204 on success; 401 if current password wrong. */
export async function changePassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/me/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getDevOnlyRequestHeaders(),
    },
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
  token: string,
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
    const response = await fetch(`${baseUrl}/auth/me/avatar`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        ...getDevOnlyRequestHeaders(),
      },
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

/** DELETE /auth/me. Deletes the current user (self-deletion). Returns on 204; throws AuthApiError on error. */
export async function deleteCurrentUser(token: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getDevOnlyRequestHeaders(),
    },
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
