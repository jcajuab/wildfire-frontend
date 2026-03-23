import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2.5 sm:px-8">
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

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
        <div className="h-[520px] w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
