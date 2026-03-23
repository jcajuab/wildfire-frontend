import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <div className="border-b border-border pb-8">
            <div className="mb-4 space-y-1">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-border pb-8">
            <div className="mb-4 space-y-1">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
            </div>
          </div>

          <div className="border-b border-border pb-8">
            <div className="mb-4 space-y-1">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-24 w-full animate-pulse rounded-md border border-destructive/20 bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
