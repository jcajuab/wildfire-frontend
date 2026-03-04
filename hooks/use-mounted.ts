"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns true only after client hydration completes.
 */
const listeners = new Set<() => void>();
let mountedSnapshot = false;
let mountSignalScheduled = false;

function emitMounted(): void {
  if (mountedSnapshot) return;
  mountedSnapshot = true;
  for (const listener of listeners) {
    listener();
  }
}

function ensureMountSignalScheduled(): void {
  if (mountSignalScheduled || typeof window === "undefined") return;
  mountSignalScheduled = true;
  queueMicrotask(emitMounted);
}

function subscribe(listener: () => void): () => void {
  ensureMountSignalScheduled();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot(): boolean {
  ensureMountSignalScheduled();
  return mountedSnapshot;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
