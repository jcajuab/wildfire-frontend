"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getAuthSnapshot } from "@/lib/auth-session";

interface AuthGuardProps {
  readonly children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useAuth();
  const redirecting = isInitialized && !isAuthenticated;

  useEffect(() => {
    if (!isInitialized || isAuthenticated) {
      return;
    }

    const timeout = setTimeout(() => {
      const snapshot = getAuthSnapshot();
      if (snapshot.user === null) {
        const loginUrl = pathname
          ? `/login?redirectTo=${encodeURIComponent(pathname)}`
          : "/login";
        router.replace(loginUrl);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [isInitialized, isAuthenticated, pathname, router]);

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Redirecting…</span>
      </div>
    );
  }

  return <>{children}</>;
}
