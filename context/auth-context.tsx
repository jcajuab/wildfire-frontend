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
  login as loginApi,
  logoutApi,
  refreshToken,
} from "@/lib/api-client";
import {
  AUTH_API_ERROR_EVENT,
  AUTH_REFRESH_REQUEST_EVENT,
  type AuthApiErrorEventDetail,
} from "@/lib/auth-events";
import { can as canPermission } from "@/lib/permissions";
import type { AuthResponse, AuthUser } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

const SESSION_KEY = "wildfire_session";
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 60_000; // check every 60 seconds
const AUTH_ERROR_SUPPRESSION_MS = 2_000;

interface SessionData {
  readonly user: AuthUser;
  readonly expiresAt: string;
  readonly permissions: PermissionType[];
  readonly token: string | null;
}

/** Old sessions without permissions get [] and can still be used. */
function getPermissionsFromSession(
  data: Record<string, unknown>,
): PermissionType[] {
  if (!Array.isArray(data.permissions)) return [];
  return data.permissions.filter(
    (p): p is PermissionType => typeof p === "string" && p.includes(":"),
  );
}

function readSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    if (typeof d.expiresAt !== "string" || d.expiresAt === "") return null;
    const user = d.user;
    if (user == null || typeof user !== "object") return null;
    const u = user as Record<string, unknown>;
    if (
      !(
        typeof u.id === "string" &&
        typeof u.email === "string" &&
        typeof u.name === "string"
      )
    )
      return null;

    const isRoot = typeof u.isRoot === "boolean" ? u.isRoot : false;
    const normalizedUser: AuthUser = {
      id: u.id,
      email: u.email,
      name: u.name,
      isRoot,
      timezone: typeof u.timezone === "string" ? u.timezone : null,
      avatarUrl: typeof u.avatarUrl === "string" ? u.avatarUrl : null,
    };
    const permissions = getPermissionsFromSession(d);
    const token = typeof d.token === "string" ? d.token : null;

    return {
      user: normalizedUser,
      expiresAt: d.expiresAt as string,
      permissions,
      token,
    };
  } catch {
    return null;
  }
}

function writeSession(data: SessionData): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly token: string | null;
  readonly permissions: PermissionType[];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  can: (permission: PermissionType) => boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setUser(session.user);
      setPermissions(session.permissions);
      setToken(session.token);
    }
    setIsInitialized(true);
  }, []);

  const inFlightRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshRequestedWhileRunningRef = useRef(false);
  const suppressAuthErrorUntilRef = useRef(0);
  const userRef = useRef(user);
  const tokenRef = useRef(token);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    clearSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshTokenCheckIntervalId = setInterval(async () => {
      if (!userRef.current) return;

      const session = readSession();
      if (!session?.expiresAt) return;

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const nowMs = Date.now();
      if (expiresAtMs - nowMs > REFRESH_THRESHOLD_MS) return;

      void refreshSessionRef.current().catch(() => undefined);
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(refreshTokenCheckIntervalId);
  }, [clearAuthState, user]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginApi(credentials);
        const session: SessionData = {
          user: result.user,
          expiresAt: result.expiresAt,
          permissions: result.permissions,
          token: result.token,
        };
        writeSession(session);
        setUser(session.user);
        setPermissions(session.permissions);
        setToken(session.token);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    clearAuthState();
    try {
      await logoutApi(tokenRef.current);
    } catch {
      // Backend no-op; ignore network errors
    }
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

          const response = await refreshToken(tokenRef.current);
          const session: SessionData = {
            user: response.user,
            expiresAt: response.expiresAt,
            permissions: response.permissions,
            token: response.token,
          };
          writeSession(session);
          setUser(session.user);
          setPermissions(session.permissions);
          setToken(session.token);
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
        const isAuthSessionRequest =
          url === "auth/session" ||
          url === "/auth/session" ||
          url.endsWith("/auth/session");
        const isSuppressed = Date.now() < suppressAuthErrorUntilRef.current;
        if (isSuppressed && !isAuthSessionRequest) {
          return;
        }
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
    const session: SessionData = {
      user: response.user,
      expiresAt: response.expiresAt,
      permissions: response.permissions,
      token: response.token,
    };
    writeSession(session);
    setUser(session.user);
    setPermissions(session.permissions);
    setToken(session.token);
  }, []);

  const can = useCallback(
    (permission: PermissionType) =>
      canPermission(permission, permissions, user?.isRoot === true),
    [permissions, user?.isRoot],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
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
      token,
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
