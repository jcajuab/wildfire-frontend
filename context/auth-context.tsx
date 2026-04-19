"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  bootstrapAccessToken,
  getAuthSnapshot,
  loginWithPassword,
  logoutAuth,
  setAuthSession,
  subscribeToAuthState,
} from "@/lib/auth-session";
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

function getServerSnapshot() {
  return getAuthSnapshot();
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const snapshot = useSyncExternalStore(
    subscribeToAuthState,
    getAuthSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    void bootstrapAccessToken();
  }, []);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      await loginWithPassword(credentials);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutAuth();
  }, []);

  const bootstrapSession = useCallback(async () => {
    await bootstrapAccessToken();
  }, []);

  const updateSession = useCallback((response: AuthResponse) => {
    setAuthSession(response);
  }, []);

  const user = snapshot.user;
  const permissions = snapshot.permissions;
  const isAuthenticated = user !== null;
  const isInitialized = snapshot.isBootstrapped;

  const value: AuthContextValue = {
    user,
    permissions,
    isAuthenticated,
    isLoading: false,
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
