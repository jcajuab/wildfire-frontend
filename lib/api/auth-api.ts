import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import {
  extractApiError,
  parseApiResponseData,
  type ApiErrorResponse,
} from "@/lib/api/contracts";
import type {
  AuthResponse,
  LoginCredentials,
  SessionResponse,
} from "@/types/auth";

interface JsonParseFailurePayload {
  readonly __parseFailure: true;
  readonly message: string;
  readonly status: number;
  readonly statusText: string;
  readonly contentType: string;
  readonly bodyPreview: string;
  readonly url: string;
}

const previewResponseBody = (body: string, maxLength = 500): string => {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
};

export const buildParseFailurePayload = (
  response: Response,
  body: string,
): JsonParseFailurePayload => {
  const contentType = response.headers.get("content-type") ?? "unknown";
  const message =
    body.trim().length === 0
      ? `Response body was empty while parsing JSON (status ${response.status}).`
      : `Response body is not valid JSON (status ${response.status}, content-type ${contentType}).`;

  return {
    __parseFailure: true,
    message,
    status: response.status,
    statusText: response.statusText,
    contentType,
    bodyPreview: previewResponseBody(body),
    url: response.url,
  };
};

export async function readJsonPayload(response: Response): Promise<unknown> {
  let body: string;

  try {
    body = await response.text();
  } catch {
    return buildParseFailurePayload(response, "");
  }

  if (body.trim() === "") {
    return buildParseFailurePayload(response, body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return buildParseFailurePayload(response, body);
  }
}

export function createAuthApiError(
  response: Response,
  payload: unknown,
): AuthApiError {
  const parsedError = extractApiError(payload) ?? undefined;
  const parseFailureMessage =
    typeof payload === "object" &&
    payload !== null &&
    Object.hasOwn(payload, "__parseFailure")
      ? (payload as { message?: unknown }).message
      : undefined;

  const parseFailureText =
    typeof parseFailureMessage === "string" ? parseFailureMessage : undefined;

  const message =
    parsedError?.error?.message ??
    parseFailureText ??
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

/** GET /auth/session. Returns current session user + permissions or throws with backend error body. */
export async function getSession(): Promise<SessionResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/auth/session`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });

  return parseApiPayload<SessionResponse>(response);
}

/** POST /auth/session/refresh. Refreshes JWT (sliding session). Returns auth payload or throws with backend error body. */
export async function refreshToken(): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const csrfToken = getCsrfToken();
  const response = await fetch(`${baseUrl}/auth/session/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  });

  return parseApiPayload<AuthResponse>(response);
}

/** POST /auth/logout. Clears server session. Does not throw. */
export async function logoutApi(): Promise<void> {
  const baseUrl = getBaseUrl();
  const csrfToken = getCsrfToken();
  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
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

/** Reads the CSRF token from the wildfire_csrf cookie (non-httpOnly, readable by JS). */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("wildfire_csrf="));
  return match ? (match.split("=")[1] ?? null) : null;
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
