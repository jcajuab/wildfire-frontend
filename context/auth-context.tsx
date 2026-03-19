"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AuthApiError,
  getSession,
  login as loginApi,
  logoutApi,
  refreshToken,
} from "@/lib/api/auth-api";
import {
  AUTH_API_ERROR_EVENT,
  AUTH_REFRESH_REQUEST_EVENT,
  type AuthApiErrorEventDetail,
} from "@/lib/auth-events";
import { can as canPermission } from "@/lib/permissions";
import type { AuthResponse, AuthUser } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 30_000; // check every 30 seconds
const AUTH_ERROR_SUPPRESSION_MS = 2_000;

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly permissions: PermissionType[];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  can: (permission: PermissionType) => boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Forces a backend-auth refresh to avoid stale permission UX after RBAC writes. */
  refreshSession: () => Promise<void>;
  /** Replace session with auth payload (e.g. after PATCH /auth/profile). */
  updateSession: (response: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    getSession()
      .then((session) => {
        setUser(session.user);
        setPermissions(session.permissions as PermissionType[]);
      })
      .catch(() => {
        // 401 or network error: user is not authenticated, that's fine
      })
      .finally(() => {
        setIsInitialized(true);
      });
  }, []);

  const inFlightRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshRequestedWhileRunningRef = useRef(false);
  const suppressAuthErrorUntilRef = useRef(0);
  const userRef = useRef(user);
  const expiresAtRef = useRef<string | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setPermissions([]);
  }, []);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("wildfire_auth");
    broadcastChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      try {
        const data = event.data as
          | { type: "logout" }
          | { type: "refresh"; session: AuthResponse; expiresAt: string }
          | { type: "session_revoked" };

        if (data.type === "logout") {
          clearAuthState();
          expiresAtRef.current = null;
        } else if (data.type === "refresh") {
          // Stale message guard: only apply if incoming expiresAt is later than current
          const incomingMs = new Date(data.expiresAt).getTime();
          const currentMs = expiresAtRef.current
            ? new Date(expiresAtRef.current).getTime()
            : 0;
          if (incomingMs > currentMs) {
            expiresAtRef.current = data.expiresAt;
            setUser(data.session.user);
            setPermissions(data.session.permissions);
          }
        } else if (data.type === "session_revoked") {
          clearAuthState();
          expiresAtRef.current = null;
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (!user) return;

    const refreshTokenCheckIntervalId = setInterval(async () => {
      if (!userRef.current) return;

      const expiresAt = expiresAtRef.current;
      if (!expiresAt) return;

      const expiresAtMs = new Date(expiresAt).getTime();
      const nowMs = Date.now();
      if (expiresAtMs - nowMs > REFRESH_THRESHOLD_MS) return;

      void refreshSessionRef.current().catch(() => undefined);
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(refreshTokenCheckIntervalId);
  }, [user]);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginApi(credentials);
        expiresAtRef.current = result.expiresAt;
        setUser(result.user);
        setPermissions(result.permissions);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    // Best-effort server call; always clear client state regardless of outcome
    await logoutApi();
    broadcastChannelRef.current?.postMessage({ type: "logout" });
    clearAuthState();
    expiresAtRef.current = null;
  }, [clearAuthState]);

  const refreshSession = useCallback(async () => {
    if (!userRef.current) return;
    if (inFlightRefreshPromiseRef.current) {
      refreshRequestedWhileRunningRef.current = true;
      return inFlightRefreshPromiseRef.current;
    }

    const refreshTask = (async () => {
      try {
        do {
          refreshRequestedWhileRunningRef.current = false;
          suppressAuthErrorUntilRef.current =
            Date.now() + AUTH_ERROR_SUPPRESSION_MS;

          const response = await refreshToken();
          expiresAtRef.current = response.expiresAt;
          setUser(response.user);
          setPermissions(response.permissions);
          broadcastChannelRef.current?.postMessage({
            type: "refresh",
            session: response,
            expiresAt: response.expiresAt,
          });
        } while (refreshRequestedWhileRunningRef.current);
      } catch (err) {
        suppressAuthErrorUntilRef.current = 0;
        if (err instanceof AuthApiError && err.status === 401) {
          clearAuthState();
        }
        throw err;
      }
    })();

    inFlightRefreshPromiseRef.current = refreshTask.finally(() => {
      inFlightRefreshPromiseRef.current = null;
    });

    return inFlightRefreshPromiseRef.current;
  }, [clearAuthState]);

  const refreshSessionRef = useRef(refreshSession);
  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAuthApiError = (event: Event) => {
      const customEvent = event as CustomEvent<AuthApiErrorEventDetail>;
      const status = customEvent.detail?.status;
      if (status === 401) {
        const url = customEvent.detail?.url ?? "";
        const normalizedUrl = url.split("?")[0] ?? url;
        const isAuthSessionRequest =
          normalizedUrl === "auth/session/refresh" ||
          normalizedUrl === "/auth/session/refresh" ||
          normalizedUrl.endsWith("/auth/session/refresh");
        const isSuppressed = Date.now() < suppressAuthErrorUntilRef.current;
        if (isSuppressed && !isAuthSessionRequest) {
          return;
        }
        broadcastChannelRef.current?.postMessage({ type: "session_revoked" });
        clearAuthState();
      }
    };

    const onAuthRefreshRequested = () => {
      if (!userRef.current) return;
      void refreshSessionRef.current().catch(() => undefined);
    };

    window.addEventListener(AUTH_API_ERROR_EVENT, onAuthApiError);
    window.addEventListener(AUTH_REFRESH_REQUEST_EVENT, onAuthRefreshRequested);
    return () => {
      window.removeEventListener(AUTH_API_ERROR_EVENT, onAuthApiError);
      window.removeEventListener(
        AUTH_REFRESH_REQUEST_EVENT,
        onAuthRefreshRequested,
      );
    };
  }, [clearAuthState]);

  const updateSession = useCallback((response: AuthResponse) => {
    expiresAtRef.current = response.expiresAt;
    setUser(response.user);
    setPermissions(response.permissions);
  }, []);

  const can = useCallback(
    (permission: PermissionType) =>
      canPermission(permission, permissions, user?.isAdmin === true),
    [permissions, user?.isAdmin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isAuthenticated: user !== null,
      isLoading,
      isInitialized,
      can,
      login,
      logout,
      refreshSession,
      updateSession,
    }),
    [
      user,
      permissions,
      isLoading,
      isInitialized,
      can,
      login,
      logout,
      refreshSession,
      updateSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
