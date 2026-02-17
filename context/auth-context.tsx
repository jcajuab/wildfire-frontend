"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthApiError,
  login as loginApi,
  logoutApi,
  refreshToken,
} from "@/lib/api-client";
import { can as canPermission } from "@/lib/permissions";
import type { AuthResponse, AuthUser } from "@/types/auth";

const SESSION_KEY = "wildfire_session";
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

interface SessionData {
  readonly user: AuthUser;
  readonly expiresAt: string;
  readonly permissions: string[];
}

/** Old sessions without permissions get []. */
function getPermissionsFromSession(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.permissions)) return [];
  return data.permissions.filter((p): p is string => typeof p === "string");
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
    const permissions = getPermissionsFromSession(d);
    return {
      user: user as AuthUser,
      expiresAt: d.expiresAt as string,
      permissions,
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
  readonly permissions: string[];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  can: (permission: string) => boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Forces a backend-auth refresh to avoid stale permission UX after RBAC writes. */
  refreshSession: () => Promise<void>;
  /** Replace session with auth payload (e.g. after PATCH /auth/me). */
  updateSession: (response: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setUser(session.user);
      setPermissions(session.permissions);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshTokenCheckIntervalId = setInterval(async () => {
      const session = readSession();
      if (!session?.expiresAt) return;

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const nowMs = Date.now();
      if (expiresAtMs - nowMs > REFRESH_THRESHOLD_MS) return;

      try {
        const response = await refreshToken();
        const newSession: SessionData = {
          user: response.user,
          expiresAt: response.expiresAt,
          permissions: response.permissions,
        };
        writeSession(newSession);
        setUser(newSession.user);
        setPermissions(newSession.permissions);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          setUser(null);
          setPermissions([]);
          clearSession();
        }
      }
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(refreshTokenCheckIntervalId);
  }, [user]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginApi(credentials);
        const session: SessionData = {
          user: result.user,
          expiresAt: result.expiresAt,
          permissions: result.permissions,
        };
        writeSession(session);
        setUser(session.user);
        setPermissions(session.permissions);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setUser(null);
    setPermissions([]);
    clearSession();
    if (typeof window !== "undefined") {
      console.info("[auth] logout");
    }
    try {
      await logoutApi();
    } catch {
      // Backend no-op; ignore network errors
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await refreshToken();
      const session: SessionData = {
        user: response.user,
        expiresAt: response.expiresAt,
        permissions: response.permissions,
      };
      writeSession(session);
      setUser(session.user);
      setPermissions(session.permissions);
    } catch (err) {
      if (
        err instanceof AuthApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        setUser(null);
        setPermissions([]);
        clearSession();
      }
      throw err;
    }
  }, []);

  const updateSession = useCallback((response: AuthResponse) => {
    const session: SessionData = {
      user: response.user,
      expiresAt: response.expiresAt,
      permissions: response.permissions,
    };
    writeSession(session);
    setUser(session.user);
    setPermissions(session.permissions);
  }, []);

  const can = useCallback(
    (permission: string) => canPermission(permission, permissions),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token: null,
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
