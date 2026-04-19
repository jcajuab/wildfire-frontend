"use client";

import { parseApiResponseData } from "@/lib/api/contracts";
import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/config";
import {
  AuthApiError,
  createAuthApiError,
  readJsonPayload,
} from "@/lib/api/auth-api";
import type {
  AuthResponse,
  AuthSnapshot,
  AuthUser,
  LoginCredentials,
} from "@/types/auth";
import type { PermissionType } from "@/types/permission";

const AUTH_CHANNEL_NAME = "wildfire_auth";
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60_000;

interface InternalAuthState {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  user: AuthUser | null;
  permissions: PermissionType[];
}

const listeners = new Set<(snapshot: AuthSnapshot) => void>();

let state: InternalAuthState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  user: null,
  permissions: [],
};

let isBootstrapped = false;
let snapshotVersion = 0;
let cachedSnapshot: AuthSnapshot | null = null;

let refreshPromise: Promise<AuthResponse> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

type BroadcastMessage =
  | { type: "session"; response: AuthResponse }
  | { type: "logout" };

function clonePermissions(
  permissions: readonly PermissionType[],
): PermissionType[] {
  return [...permissions];
}

function getHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = new Headers(initialHeaders);
  for (const [key, value] of Object.entries(getDevOnlyRequestHeaders())) {
    headers.set(key, value);
  }
  return headers;
}

function notifyListeners(): void {
  const snapshot = getAuthSnapshot();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function ensureBroadcastChannel(): void {
  if (typeof window === "undefined" || broadcastChannel != null) {
    return;
  }

  const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "session") {
      applyAuthResponse(message.response, false);
      return;
    }

    if (message.type === "logout") {
      clearAuthSession(false);
    }
  };

  broadcastChannel = channel;
}

function broadcast(message: BroadcastMessage): void {
  ensureBroadcastChannel();
  broadcastChannel?.postMessage(message);
}

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw createAuthApiError(response, payload);
  }
  return parseApiResponseData<AuthResponse>(payload);
}

function applyAuthResponse(
  response: AuthResponse,
  shouldBroadcast: boolean,
): void {
  state = {
    accessToken: response.accessToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
    user: response.user,
    permissions: clonePermissions(response.permissions),
  };
  snapshotVersion += 1;
  cachedSnapshot = null;
  notifyListeners();

  if (shouldBroadcast) {
    broadcast({ type: "session", response });
  }
}

export function setAuthSession(response: AuthResponse): void {
  applyAuthResponse(response, true);
}

export function clearAuthSession(shouldBroadcast = true): void {
  state = {
    accessToken: null,
    accessTokenExpiresAt: null,
    user: null,
    permissions: [],
  };
  snapshotVersion += 1;
  cachedSnapshot = null;
  notifyListeners();

  if (shouldBroadcast) {
    broadcast({ type: "logout" });
  }
}

export function getAuthSnapshot(): AuthSnapshot {
  if (cachedSnapshot !== null) {
    return cachedSnapshot;
  }
  cachedSnapshot = {
    accessToken: state.accessToken,
    accessTokenExpiresAt: state.accessTokenExpiresAt,
    user: state.user,
    permissions: clonePermissions(state.permissions),
    isBootstrapped,
  };
  return cachedSnapshot;
}

export function subscribeToAuthState(
  listener: (snapshot: AuthSnapshot) => void,
): () => void {
  ensureBroadcastChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function shouldRefreshAccessToken(
  thresholdMs = ACCESS_TOKEN_REFRESH_THRESHOLD_MS,
): boolean {
  if (state.accessToken == null || state.accessTokenExpiresAt == null) {
    return false;
  }

  const expiresAtMs = new Date(state.accessTokenExpiresAt).getTime();
  return expiresAtMs - Date.now() <= thresholdMs;
}

export function getAuthorizationHeaderValue(): string | null {
  if (state.accessToken == null || state.accessToken.length === 0) {
    return null;
  }
  return `Bearer ${state.accessToken}`;
}

export function getAuthorizationHeaders(): Record<string, string> {
  const authorization = getAuthorizationHeaderValue();
  return authorization == null ? {} : { Authorization: authorization };
}

export async function loginWithPassword(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  ensureBroadcastChannel();

  const response = await fetch(`${getBaseUrl()}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(credentials),
  });

  const auth = await parseAuthResponse(response);
  applyAuthResponse(auth, true);
  return auth;
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  ensureBroadcastChannel();

  if (refreshPromise != null) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
    });

    const auth = await parseAuthResponse(response);
    applyAuthResponse(auth, true);
    return auth;
  })()
    .catch((error) => {
      if (error instanceof AuthApiError && error.status === 401) {
        clearAuthSession(true);
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function bootstrapAccessToken(): Promise<void> {
  if (state.accessToken != null && state.accessToken.length > 0) {
    isBootstrapped = true;
    snapshotVersion += 1;
    cachedSnapshot = null;
    notifyListeners();
    return;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      return;
    }
    throw error;
  } finally {
    isBootstrapped = true;
    snapshotVersion += 1;
    cachedSnapshot = null;
    notifyListeners();
  }
}

export async function logoutAuth(): Promise<void> {
  try {
    await fetch(`${getBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
    });
  } finally {
    clearAuthSession(true);
  }
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  if (state.accessToken == null) {
    return null;
  }

  if (!shouldRefreshAccessToken()) {
    return state.accessToken;
  }

  try {
    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
  } catch {
    return state.accessToken;
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { retryOn401?: boolean } = {},
): Promise<Response> {
  await ensureFreshAccessToken();

  const execute = async (): Promise<Response> => {
    const headers = getHeaders(init.headers);
    const authorization = getAuthorizationHeaderValue();
    if (authorization != null) {
      headers.set("Authorization", authorization);
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? "same-origin",
    });
  };

  let response = await execute();
  if (response.status !== 401 || options.retryOn401 === false) {
    return response;
  }

  try {
    await refreshAccessToken();
  } catch {
    return response;
  }

  response = await execute();
  return response;
}
