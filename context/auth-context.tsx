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
import type { AuthUser } from "@/types/auth";

const SESSION_KEY = "wildfire_session";
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

interface SessionData {
  readonly token: string;
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
    if (
      typeof d.token !== "string" ||
      typeof d.expiresAt !== "string" ||
      d.expiresAt === ""
    )
      return null;
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
      token: d.token as string,
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
      setPermissions(session.permissions);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    const refreshTokenCheckIntervalId = setInterval(async () => {
      const session = readSession();
      if (!session?.expiresAt) return;

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const nowMs = Date.now();
      if (expiresAtMs - nowMs > REFRESH_THRESHOLD_MS) return;

      try {
        const response = await refreshToken(session.token);
        const newSession: SessionData = {
          token: response.token,
          user: response.user,
          expiresAt: response.expiresAt,
          permissions: response.permissions,
        };
        writeSession(newSession);
        setToken(newSession.token);
        setUser(newSession.user);
        setPermissions(newSession.permissions);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          setToken(null);
          setUser(null);
          setPermissions([]);
          clearSession();
        }
      }
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(refreshTokenCheckIntervalId);
  }, [token]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginApi(credentials);
        const session: SessionData = {
          token: result.token,
          user: result.user,
          expiresAt: result.expiresAt,
          permissions: result.permissions,
        };
        writeSession(session);
        setToken(session.token);
        setUser(session.user);
        setPermissions(session.permissions);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const currentToken = token;
    setToken(null);
    setUser(null);
    setPermissions([]);
    clearSession();
    if (typeof window !== "undefined") {
      console.info("[auth] logout");
    }
    if (currentToken) {
      try {
        await logoutApi(currentToken);
      } catch {
        // Backend no-op; ignore network errors
      }
    }
  }, [token]);

  const can = useCallback(
    (permission: string) => canPermission(permission, permissions),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      permissions,
      isAuthenticated: token !== null && user !== null,
      isLoading,
      isInitialized,
      can,
      login,
      logout,
    }),
    [user, token, permissions, isLoading, isInitialized, can, login, logout],
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
