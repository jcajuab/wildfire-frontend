import type { ReactElement } from "react";
import { AuthBrandShell } from "@/components/layout/auth-brand-shell";

export default function Loading(): ReactElement {
  return (
    <AuthBrandShell>
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </AuthBrandShell>
  );
}
