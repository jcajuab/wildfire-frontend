"use client";

import React, {
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
import type { AuthUser } from "@/types/auth";

const SESSION_KEY = "wildfire_session";
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

interface SessionData {
  readonly token: string;
  readonly user: AuthUser;
  readonly expiresAt: string;
}

function isValidSessionData(data: unknown): data is SessionData {
  if (data == null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (
    typeof d.token !== "string" ||
    typeof d.expiresAt !== "string" ||
    d.expiresAt === ""
  )
    return false;
  const user = d.user;
  if (user == null || typeof user !== "object") return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    typeof u.name === "string"
  );
}

function readSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as unknown;
    if (!isValidSessionData(data)) return null;

    return { token: data.token, user: data.user, expiresAt: data.expiresAt };
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
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
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
        };
        writeSession(newSession);
        setToken(newSession.token);
        setUser(newSession.user);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          setToken(null);
          setUser(null);
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
        };
        writeSession(session);
        setToken(session.token);
        setUser(session.user);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: token !== null && user !== null,
      isLoading,
      isInitialized,
      login,
      logout,
    }),
    [user, token, isLoading, isInitialized, login, logout],
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
