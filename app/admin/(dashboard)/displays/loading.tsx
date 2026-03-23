import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-36 animate-pulse rounded bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
