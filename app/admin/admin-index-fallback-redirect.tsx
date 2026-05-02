"use client";

import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";

function normalizePath(path: string): string {
  const t = path.replace(/\/+/g, "/").replace(/\/+$/, "");
  return t === "" ? "/" : t;
}

function targetPathname(target: string): string {
  const q = target.indexOf("?");
  return normalizePath(q === -1 ? target : target.slice(0, q));
}

/**
 * Used when the server cannot resolve a session (cookie not visible to RSC or
 * `/auth/refresh` fails server-side). Client bootstrap may still have a valid
 * session — navigate here instead of server-redirecting to `/login`, which
 * would fight the login page’s “already authenticated → go to redirectTo”
 * effect and cause an infinite loop.
 */
export function AdminIndexFallbackRedirect(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { can, isAuthenticated, isInitialized } = useAuth();
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!isInitialized || didNavigate.current) return;

    const target = isAuthenticated
      ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
      : `/login?redirectTo=${encodeURIComponent("/admin")}`;

    if (normalizePath(pathname) === targetPathname(target)) {
      return;
    }

    didNavigate.current = true;
    router.replace(target);
  }, [isInitialized, isAuthenticated, can, router, pathname]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <span className="text-sm text-muted-foreground">Redirecting…</span>
    </div>
  );
}
