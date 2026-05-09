import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <div className="shrink-0 border-b border-border bg-background p-4">
        <div className="grid min-w-0 grid-cols-1 items-center gap-3 md:grid-cols-[auto_minmax(12rem,1fr)_auto]">
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          <div className="flex min-w-0 justify-center">
            <div className="h-9 w-full max-w-[44rem] animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded bg-muted md:justify-self-end" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="divide-y divide-border">
            <div className="flex items-center gap-4 bg-muted/30 px-4 py-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-24 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
