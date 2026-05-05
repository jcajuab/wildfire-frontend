"use client";

import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";

export function AuthGate({ redirectTo }: { redirectTo: string }): ReactElement {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const didAct = useRef(false);

  useEffect(() => {
    if (!isInitialized || didAct.current) return;
    didAct.current = true;

    if (isAuthenticated) {
      router.refresh();
      return;
    }

    router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }, [isInitialized, isAuthenticated, router, redirectTo]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}
