"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import { useAuth } from "@/context/auth-context";

export default function Page(): ReactElement {
  const router = useRouter();
  const { can, isAuthenticated, isInitialized } = useAuth();
  const redirectRoute = isAuthenticated
    ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
    : "/login";

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(redirectRoute);
  }, [isInitialized, redirectRoute, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <span className="text-sm text-muted-foreground">Redirecting…</span>
    </div>
  );
}
