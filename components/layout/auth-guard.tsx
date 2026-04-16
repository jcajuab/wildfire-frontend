"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  readonly children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { bootstrapSession, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function runBootstrap(): Promise<void> {
      if (!isAuthenticated) {
        try {
          await bootstrapSession();
        } finally {
          if (!cancelled) {
            setIsChecking(false);
          }
        }
        return;
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
    if (!isChecking && !isAuthenticated) {
      const loginUrl = pathname
        ? `/login?redirectTo=${encodeURIComponent(pathname)}`
        : "/login";
      router.replace(loginUrl);
    }
  }, [isChecking, isAuthenticated, pathname, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Redirecting…</span>
      </div>
    );
  }

  return <>{children}</>;
}
