"use client";

import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeToAuthState } from "@/lib/auth-session";

/**
 * Returns whether the current user can modify a resource.
 * Admin: always true. Non-admin: true only when the resource owner matches.
 * Pass `null`/`undefined` for resources without owners (e.g. displays) — non-admins cannot modify those.
 */
export function useCanModifyResource(
  ownerId: string | null | undefined,
): boolean {
  const snapshot = useSyncExternalStore(
    subscribeToAuthState,
    getAuthSnapshot,
    getAuthSnapshot,
  );
  const user = snapshot.user;
  if (!user) return false;
  if (user.isAdmin) return true;
  if (!ownerId) return false;
  return user.id === ownerId;
}
