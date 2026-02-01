"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login as loginApi, logoutApi } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

const SESSION_KEY = "wildfire_session";

interface SessionData {
  readonly token: string;
  readonly user: AuthUser;
}

function readSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    if (
      typeof data?.token !== "string" ||
      !data?.user ||
      typeof data.user.id !== "string" ||
      typeof data.user.email !== "string" ||
      typeof data.user.name !== "string"
    ) {
      return null;
    }
    return { token: data.token, user: data.user };
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

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginApi(credentials);
        const session: SessionData = {
          token: result.token,
          user: result.user,
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
