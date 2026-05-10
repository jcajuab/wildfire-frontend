"use client";

import { useEffect, useState } from "react";

const DEFAULT_STARTUP_DELAY_MS = 400;
const SLOW_CONNECTION_STARTUP_DELAY_MS = 1800;

interface NetworkConnectionLike {
  readonly effectiveType?: string;
  readonly saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkConnectionLike;
}

function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as NavigatorWithConnection).connection;
  if (connection == null) {
    return false;
  }

  if (connection.saveData === true) {
    return true;
  }

  const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
  return effectiveType.includes("2g") || effectiveType.includes("3g");
}

function getStartupDelayMs(): number {
  return isSlowConnection()
    ? SLOW_CONNECTION_STARTUP_DELAY_MS
    : DEFAULT_STARTUP_DELAY_MS;
}

export function useDeferredDashboardStartup(enabled: boolean): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsReady(true);
    }, getStartupDelayMs());

    return () => window.clearTimeout(timeoutId);
  }, [enabled]);

  return enabled && isReady;
}
