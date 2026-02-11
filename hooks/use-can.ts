"use client";

import { useAuth } from "@/context/auth-context";

/**
 * Returns whether the current user has the given permission (resource:action).
 */
export function useCan(permission: string): boolean {
  const { can } = useAuth();
  return can(permission);
}
