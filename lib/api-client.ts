import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import {
  parseApiListResponseDataSafe,
  parseApiResponseData,
} from "@/lib/api/contracts";
import { createAuthApiError, readJsonPayload } from "@/lib/api/auth-api";
import type { AuthResponse } from "@/types/auth";
import type { InvitationRecord } from "@/types/invitation";

export { AuthApiError } from "@/lib/api/auth-api";

async function parseApiPayload<T>(response: Response): Promise<T> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  return parseApiResponseData<T>(payload);
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

export interface CreateInvitationResponse {
  readonly id: string;
  readonly expiresAt: string;
  readonly inviteUrl?: string;
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
  username: string;
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

/** PUT /users/:id/status. Suspends a user's access. */
export async function banUser(userId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/users/${userId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify({ banned: true }),
  });

  if (response.status === 204) return;

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

/** PUT /users/:id/status. Restores a user's access. */
export async function unbanUser(userId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/users/${userId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify({ banned: false }),
  });

  if (response.status === 204) return;

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

export interface AdminResetPasswordResponse {
  readonly password: string;
}

/** POST /users/:id/reset-password. Admin resets a user's password and returns the new random password. */
export async function adminResetPassword(
  userId: string,
): Promise<AdminResetPasswordResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/users/${userId}/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });

  return parseApiPayload<AdminResetPasswordResponse>(response);
}
