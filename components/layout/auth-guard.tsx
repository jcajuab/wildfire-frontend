"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  readonly children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      const loginUrl = pathname
        ? `/login?redirectTo=${encodeURIComponent(pathname)}`
        : "/login";
      router.replace(loginUrl);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  if (isInitialized && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Redirecting…</span>
      </div>
    );
  }

  return <>{children}</>;
}
