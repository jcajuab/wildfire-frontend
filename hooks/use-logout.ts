"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/auth-context";

export interface UseLogoutResult {
  readonly pending: boolean;
  logout: () => Promise<void>;
}

export function useLogout(): UseLogoutResult {
  const { logout: authLogout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [authLogout, isLoggingOut]);

  return { pending: isLoggingOut, logout };
}
