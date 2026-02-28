"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getFirstPermittedAdminRoute } from "@/lib/route-permissions";

export default function Page(): ReactElement {
  const router = useRouter();
  const { isAuthenticated, isInitialized, permissions, user } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const fallbackRoute = getFirstPermittedAdminRoute(
      permissions,
      user?.isRoot === true,
    );
    router.replace(fallbackRoute ?? "/unauthorized");
  }, [isAuthenticated, isInitialized, permissions, router, user?.isRoot]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-sm text-muted-foreground">Redirecting…</span>
    </div>
  );
}
