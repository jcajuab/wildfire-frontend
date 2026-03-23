import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="grid min-h-svh bg-background md:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
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
      </section>
      <aside className="hidden bg-primary md:block" />
    </div>
  );
}
