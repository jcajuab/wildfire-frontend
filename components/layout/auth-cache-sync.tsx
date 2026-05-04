"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api/api";

/**
 * Resets the RTK Query cache whenever the authenticated user changes,
 * so a previously logged-in user's data never bleeds into the next
 * session in the same browser tab.
 */
export function AuthCacheSync(): null {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);
  const userId = user?.id ?? null;

  useEffect(() => {
    const previous = previousUserIdRef.current;
    previousUserIdRef.current = userId;
    if (previous !== undefined && previous !== userId) {
      dispatch(api.util.resetApiState());
    }
  }, [userId, dispatch]);

  return null;
}
