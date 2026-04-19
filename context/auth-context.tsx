"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSession, login as loginApi, logoutApi } from "@/lib/api/auth-api";
import { can as canPermission } from "@/lib/permissions";
import type { AuthResponse, AuthUser } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly permissions: PermissionType[];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  can: (permission: PermissionType) => boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapSession: () => Promise<void>;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getSession()
      .then((session) => {
        setUser(session.user);
        setPermissions(session.permissions);
      })
      .catch(() => {
        setUser(null);
        setPermissions([]);
      })
      .finally(() => {
        setIsInitialized(true);
      });
  }, []);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      setIsLoading(true);
      try {
        const response = await loginApi(credentials);
        setUser(response.user);
        setPermissions(response.permissions);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    try {
      const session = await getSession();
      setUser(session.user);
      setPermissions(session.permissions);
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const updateSession = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setPermissions(response.permissions);
  }, []);

  const value: AuthContextValue = {
    user,
    permissions,
    isAuthenticated: user !== null,
    isLoading,
    isInitialized,
    can: (permission: PermissionType) =>
      canPermission(permission, permissions, user?.isAdmin ?? false),
    login,
    logout,
    bootstrapSession,
    updateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
