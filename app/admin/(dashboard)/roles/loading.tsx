import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="divide-y divide-border">
            <div className="flex items-center gap-4 bg-muted/30 px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="ml-auto flex gap-2">
                  <div className="h-7 w-14 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-14 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
