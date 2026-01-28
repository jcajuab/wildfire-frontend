"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns true on the client after hydration, false during SSR.
 * Uses useSyncExternalStore which is the React 18+ way to safely
 * detect client-side rendering without causing hydration mismatches.
 */
function subscribe(): () => void {
  // No-op subscribe - the mounted state never changes after initial render
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
