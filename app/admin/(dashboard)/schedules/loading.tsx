import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <div className="shrink-0 border-b border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-muted/15 p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="h-[520px] w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
