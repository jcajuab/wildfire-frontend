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
const MIN_REFRESH_INTERVAL_MS = 2000;
const SESSION_HINT_KEY = "wildfire_has_session";
const REFRESH_LOCK_NAME = "wildfire-auth-refresh";

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
let cachedSnapshot: AuthSnapshot | null = null;
let bootstrapResolvers: Array<() => void> = [];

let refreshPromise: Promise<AuthResponse> | null = null;
let lastRefreshAt: number | null = null;
let lastRefreshResponse: AuthResponse | null = null;
let refreshAbortController: AbortController | null = null;
let authGeneration = 0;

interface BrowserLockManager {
  request<T>(
    name: string,
    options: { mode: "exclusive" },
    callback: () => Promise<T>,
  ): Promise<T>;
}

class StaleRefreshError extends Error {
  constructor() {
    super("Stale refresh response ignored");
    this.name = "StaleRefreshError";
  }
}

function isRefreshInterruption(error: unknown): boolean {
  return (
    error instanceof StaleRefreshError ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

function resetRefreshState({ abort = false }: { abort?: boolean } = {}): void {
  lastRefreshAt = null;
  lastRefreshResponse = null;
  if (abort) {
    refreshPromise = null;
    refreshAbortController?.abort();
    refreshAbortController = null;
  }
}

function markBootstrapped(): void {
  isBootstrapped = true;
  const resolvers = bootstrapResolvers;
  bootstrapResolvers = [];
  for (const resolve of resolvers) {
    resolve();
  }
}
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
  options: { advanceGeneration?: boolean; markBootstrapped?: boolean } = {},
): void {
  if (options.advanceGeneration === true) {
    authGeneration += 1;
  }
  state = {
    accessToken: response.accessToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
    user: response.user,
    permissions: clonePermissions(response.permissions),
  };
  cachedSnapshot = null;

  try {
    sessionStorage.setItem(SESSION_HINT_KEY, "1");
  } catch {
    // sessionStorage may be unavailable (SSR, private browsing quota).
  }

  if (options.markBootstrapped === true) {
    markBootstrapped();
  }

  notifyListeners();

  if (shouldBroadcast) {
    broadcast({ type: "session", response });
  }
}

export function setAuthSession(response: AuthResponse): void {
  resetRefreshState({ abort: true });
  applyAuthResponse(response, true, { advanceGeneration: true });
}

export function seedAuthSession(response: AuthResponse): void {
  if (
    isBootstrapped &&
    state.accessToken === response.accessToken &&
    state.accessTokenExpiresAt === response.accessTokenExpiresAt &&
    state.user?.id === response.user.id
  ) {
    return;
  }

  resetRefreshState();
  applyAuthResponse(response, false, {
    advanceGeneration: true,
    markBootstrapped: true,
  });
}

export function clearAuthSession(shouldBroadcast = true): void {
  authGeneration += 1;
  resetRefreshState({ abort: true });
  state = {
    accessToken: null,
    accessTokenExpiresAt: null,
    user: null,
    permissions: [],
  };
  cachedSnapshot = null;

  try {
    sessionStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // sessionStorage may be unavailable.
  }

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

export function waitForBootstrap(): Promise<void> {
  if (isBootstrapped) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    bootstrapResolvers.push(resolve);
  });
}

export function getAuthorizationHeaders(): Record<string, string> {
  const authorization = getAuthorizationHeaderValue();
  return authorization == null ? {} : { Authorization: authorization };
}

function getAuthResponseFromState(): AuthResponse | null {
  if (
    state.accessToken == null ||
    state.accessTokenExpiresAt == null ||
    state.user == null
  ) {
    return null;
  }

  return {
    type: "bearer",
    accessToken: state.accessToken,
    accessTokenExpiresAt: state.accessTokenExpiresAt,
    user: state.user,
    permissions: clonePermissions(state.permissions),
  };
}

function getRefreshLockManager(): BrowserLockManager | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const maybeLocks = (navigator as Navigator & { locks?: BrowserLockManager })
    .locks;
  return maybeLocks ?? null;
}

async function withRefreshLock<T>(callback: () => Promise<T>): Promise<T> {
  const locks = getRefreshLockManager();
  if (locks == null) {
    return callback();
  }

  return locks.request(REFRESH_LOCK_NAME, { mode: "exclusive" }, callback);
}

export async function loginWithPassword(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  ensureBroadcastChannel();
  resetRefreshState({ abort: true });

  const response = await fetch(`${getBaseUrl()}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(credentials),
  });

  const auth = await parseAuthResponse(response);
  resetRefreshState({ abort: true });
  applyAuthResponse(auth, true, { advanceGeneration: true });
  return auth;
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  ensureBroadcastChannel();

  if (refreshPromise != null) {
    return refreshPromise;
  }

  if (
    lastRefreshAt != null &&
    lastRefreshResponse != null &&
    Date.now() - lastRefreshAt < MIN_REFRESH_INTERVAL_MS
  ) {
    return Promise.resolve(lastRefreshResponse);
  }

  const canReuseFreshSessionAfterLock =
    state.accessToken == null || shouldRefreshAccessToken();
  let controllerForPromise: AbortController | null = null;

  const promise = withRefreshLock(async () => {
    const currentAuth = getAuthResponseFromState();
    if (
      canReuseFreshSessionAfterLock &&
      currentAuth != null &&
      !shouldRefreshAccessToken()
    ) {
      return currentAuth;
    }

    if (
      lastRefreshAt != null &&
      lastRefreshResponse != null &&
      Date.now() - lastRefreshAt < MIN_REFRESH_INTERVAL_MS
    ) {
      return lastRefreshResponse;
    }

    const generationAtStart = authGeneration;
    const controller = new AbortController();
    controllerForPromise = controller;
    refreshAbortController = controller;

    const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
      signal: controller.signal,
    });

    if (authGeneration !== generationAtStart) {
      throw new StaleRefreshError();
    }

    const auth = await parseAuthResponse(response);
    if (authGeneration !== generationAtStart) {
      throw new StaleRefreshError();
    }
    lastRefreshAt = Date.now();
    lastRefreshResponse = auth;
    applyAuthResponse(auth, true);
    return auth;
  });

  refreshPromise = promise;

  void promise.then(
    () => {
      if (refreshPromise === promise) {
        refreshPromise = null;
      }
      if (
        controllerForPromise != null &&
        refreshAbortController === controllerForPromise
      ) {
        refreshAbortController = null;
      }
    },
    () => {
      if (refreshPromise === promise) {
        refreshPromise = null;
      }
      if (
        controllerForPromise != null &&
        refreshAbortController === controllerForPromise
      ) {
        refreshAbortController = null;
      }
    },
  );

  return promise;
}

export async function bootstrapAccessToken(): Promise<void> {
  if (state.accessToken != null && state.accessToken.length > 0) {
    markBootstrapped();
    cachedSnapshot = null;
    notifyListeners();
    return;
  }

  let hasSessionHint = false;
  try {
    hasSessionHint = sessionStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    hasSessionHint = true;
  }

  if (!hasSessionHint) {
    markBootstrapped();
    cachedSnapshot = null;
    notifyListeners();
    return;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    if (isRefreshInterruption(error)) {
      return;
    }
    if (error instanceof AuthApiError && error.status === 401) {
      await purgeStaleSession();
      return;
    }
    throw error;
  } finally {
    markBootstrapped();
    cachedSnapshot = null;
    notifyListeners();
  }
}

/**
 * Clear both in-memory auth state AND the HttpOnly refresh cookie.
 * The logout call MUST be awaited so the browser processes the cookie-delete
 * Set-Cookie before any subsequent login can set a new cookie (otherwise the
 * delete can arrive after the login and nuke the fresh cookie).
 */
export async function purgeStaleSession(): Promise<void> {
  clearAuthSession(true);
  try {
    await fetch(`${getBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
    });
  } catch {
    // Network error is fine — cookie may already be gone.
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

  // Snapshot the full auth state before refresh. If the refresh fails we
  // restore the pre-refresh state so the caller can still attempt its
  // request with the old (possibly still valid) token.
  const stateBeforeRefresh = { ...state };
  try {
    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
  } catch {
    // Restore the auth state that was wiped by the failed refresh.
    state = stateBeforeRefresh;
    cachedSnapshot = null;
    notifyListeners();
    return stateBeforeRefresh.accessToken;
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
      // include the HttpOnly refresh cookie on every authFetch — endpoints
      // like /auth/me/avatar verify the cookie alongside the bearer token.
      // With same-origin (the previous default) cross-origin dev builds
      // (frontend :3000 → backend :8000) silently dropped the cookie and
      // returned 401 even though the access token was valid.
      credentials: init.credentials ?? "include",
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
