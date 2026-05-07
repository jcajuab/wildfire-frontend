import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/config";
import {
  parseApiListResponseSafe,
  parseApiResponseData,
} from "@/lib/api/contracts";
import { createAuthApiError, readJsonPayload } from "@/lib/api/auth-api";
import { authFetch } from "@/lib/auth-session";
import type { AuthResponse } from "@/types/auth";
import type {
  InvitationListResponse,
  InvitationRecord,
  InvitationSortField,
  InvitationStatusFilter,
} from "@/types/invitation";

export { AuthApiError } from "@/lib/api/auth-api";

async function parseApiPayload<T>(response: Response): Promise<T> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  return parseApiResponseData<T>(payload);
}

/** PATCH /auth/profile. Update current user profile and return a replacement auth payload.
 *
 * For safe fields (name, timezone) we disable the 401→refresh→clearSession
 * cascade so the user stays logged in even if the backend rejects the update.
 * For identity fields (username, email) a 401 is expected to revoke the session.
 */
export async function updateCurrentUserProfile(payload: {
  name?: string;
  timezone?: string | null;
  username?: string;
  email?: string | null;
}): Promise<AuthResponse> {
  const isSafeFieldOnly =
    payload.username === undefined && payload.email === undefined;

  const baseUrl = getBaseUrl();
  const response = await authFetch(
    `${baseUrl}/auth/profile`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    { retryOn401: !isSafeFieldOnly },
  );

  return parseApiPayload<AuthResponse>(response);
}

/** POST /auth/password/change. Change current user password. Returns 204 on success; 401 if current password wrong. */
export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(`${baseUrl}/auth/password/change`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 204) return;

  const payloadData = await readJsonPayload(response);
  throw createAuthApiError(response, payloadData);
}

const AVATAR_UPLOAD_TIMEOUT_MS = 30_000;

/** PUT /auth/me/avatar. Upload or replace current user avatar. Returns full auth payload; use updateSession to refresh.
 *
 * Disables 401 retry — avatar upload is a safe operation that should never
 * revoke the session. If the backend returns 401, show an error instead of logging out.
 */
export async function uploadAvatar(file: File): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AVATAR_UPLOAD_TIMEOUT_MS,
  );

  try {
    const response = await authFetch(
      `${baseUrl}/auth/me/avatar`,
      {
        method: "PUT",
        body: formData,
        signal: controller.signal,
      },
      { retryOn401: false },
    );

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
export async function deleteCurrentUser(): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(`${baseUrl}/auth/profile`, {
    method: "DELETE",
  });

  if (response.status === 204) return;

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

export interface CreateInvitationResponse {
  readonly id: string;
  readonly expiresAt: string;
}

/** POST /auth/invitations. Requires users:create permission. */
export async function createInvitation(input: {
  email: string;
  name?: string;
}): Promise<CreateInvitationResponse> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(`${baseUrl}/auth/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiPayload<CreateInvitationResponse>(response);
}

export interface InvitationListQuery {
  readonly q?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: InvitationStatusFilter;
  readonly sortBy?: InvitationSortField;
  readonly sortDirection?: "asc" | "desc";
}

/** GET /auth/invitations. Returns recent invitation records. */
export async function getInvitations(
  query: InvitationListQuery = {},
): Promise<InvitationListResponse> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/auth/invitations`);
  if (query.q) url.searchParams.set("q", query.q);
  if (query.page != null) url.searchParams.set("page", String(query.page));
  if (query.pageSize != null) {
    url.searchParams.set("pageSize", String(query.pageSize));
  }
  if (query.status && query.status !== "all") {
    url.searchParams.set("status", query.status);
  }
  if (query.sortBy) url.searchParams.set("sortBy", query.sortBy);
  if (query.sortDirection) {
    url.searchParams.set("sortDirection", query.sortDirection);
  }

  const response = await authFetch(url.toString(), {
    method: "GET",
  });

  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  const parsed = parseApiListResponseSafe<InvitationRecord>(
    payload,
    "getInvitations",
  );
  return {
    items: parsed.data,
    total: parsed.meta.total,
    page: parsed.meta.page,
    pageSize: parsed.meta.pageSize,
  };
}

/** POST /auth/invitations/:id/resend. */
export async function resendInvitation(
  id: string,
): Promise<CreateInvitationResponse> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(`${baseUrl}/auth/invitations/${id}/resend`, {
    method: "POST",
  });

  return parseApiPayload<CreateInvitationResponse>(response);
}

/** POST /auth/invitations/:id/reveal-link. Returns actual invite URL. Requires users:create permission. */
export async function revealInviteLink(
  id: string,
): Promise<{ inviteUrl: string }> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(
    `${baseUrl}/auth/invitations/${encodeURIComponent(id)}/reveal-link`,
    {
      method: "POST",
    },
  );
  return parseApiPayload<{ inviteUrl: string }>(response);
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
  const response = await authFetch(`${baseUrl}/users/${userId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ banned: true }),
  });

  if (response.ok) return;

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

/** PUT /users/:id/status. Restores a user's access. */
export async function unbanUser(userId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(`${baseUrl}/users/${userId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ banned: false }),
  });

  if (response.ok) return;

  const payload = await readJsonPayload(response);
  throw createAuthApiError(response, payload);
}

interface AdminResetPasswordResponse {
  readonly password: string;
}

/** POST /users/:id/reset-password. Admin resets a user's password and returns the new random password. */
export async function adminResetPassword(
  userId: string,
): Promise<AdminResetPasswordResponse> {
  const baseUrl = getBaseUrl();
  const response = await authFetch(
    `${baseUrl}/users/${userId}/reset-password`,
    {
      method: "POST",
    },
  );

  return parseApiPayload<AdminResetPasswordResponse>(response);
}
