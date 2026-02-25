"use client";

import { useAuth } from "@/context/auth-context";
import type { PermissionType } from "@/types/permission";

/**
 * Returns whether the current user has the given permission (resource:action).
 */
export function useCan(permission: PermissionType): boolean {
  const { can } = useAuth();
  return can(permission);
}
