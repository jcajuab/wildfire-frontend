"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import { useAuth } from "@/context/auth-context";

export default function Page(): ReactElement {
  const router = useRouter();
  const { bootstrapSession, can, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const redirectRoute = isAuthenticated
    ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
    : "/login";

  useEffect(() => {
    let cancelled = false;

    async function runBootstrap(): Promise<void> {
      if (!isAuthenticated) {
        try {
          await bootstrapSession();
        } catch {
          // Redirect below will fall back to /login.
        }
      }

      if (!cancelled) {
        setIsChecking(false);
      }
    }

    void runBootstrap();
    return () => {
      cancelled = true;
    };
  }, [bootstrapSession, isAuthenticated]);

  useEffect(() => {
    if (isChecking) return;
    router.replace(redirectRoute);
  }, [isChecking, redirectRoute, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <span className="text-sm text-muted-foreground">Redirecting…</span>
    </div>
  );
}
