"use client";

import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  bootstrapAccessToken,
  getAuthSnapshot,
  loginWithPassword,
  logoutAuth,
  refreshAccessToken,
  setAuthSession,
  subscribeToAuthState,
} from "@/lib/auth-session";
import { can as canPermission } from "@/lib/permissions";
import type { AuthResponse, AuthUser } from "@/types/auth";
import type { PermissionType } from "@/types/permission";

const REFRESH_THRESHOLD_MS = 60_000;
const REFRESH_CHECK_INTERVAL_MS = 30_000;

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
  refreshSession: () => Promise<void>;
  updateSession: (response: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const snapshot = getAuthSnapshot();
  const [user, setUser] = useState<AuthUser | null>(snapshot.user);
  const [permissions, setPermissions] = useState<PermissionType[]>(
    snapshot.permissions,
  );
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<
    string | null
  >(snapshot.accessTokenExpiresAt);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return subscribeToAuthState((nextSnapshot) => {
      setUser(nextSnapshot.user);
      setPermissions(nextSnapshot.permissions);
      setAccessTokenExpiresAt(nextSnapshot.accessTokenExpiresAt);
    });
  }, []);

  useEffect(() => {
    if (!user || !accessTokenExpiresAt) {
      return;
    }

    const refreshTokenCheckIntervalId = setInterval(() => {
      const expiresAtMs = new Date(accessTokenExpiresAt).getTime();
      if (expiresAtMs - Date.now() > REFRESH_THRESHOLD_MS) {
        return;
      }

      void refreshAccessToken().catch(() => undefined);
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(refreshTokenCheckIntervalId);
  }, [user, accessTokenExpiresAt]);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      setIsLoading(true);
      try {
        await loginWithPassword(credentials);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    await bootstrapAccessToken();
  }, []);

  const refreshSession = useCallback(async () => {
    await refreshAccessToken();
  }, []);

  const updateSession = useCallback((response: AuthResponse) => {
    setAuthSession(response);
  }, []);

  const value = {
    user,
    permissions,
    isAuthenticated: user !== null,
    isLoading,
    isInitialized: true,
    can: (permission: PermissionType) =>
      canPermission(permission, permissions, user?.isAdmin ?? false),
    login,
    logout,
    bootstrapSession,
    refreshSession,
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
