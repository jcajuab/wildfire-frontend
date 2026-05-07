import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <div className="shrink-0 border-b border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
              <div className="flex shrink-0 justify-end border-b border-border px-4 py-3">
                <div className="h-8 w-full max-w-80 animate-pulse rounded bg-muted" />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-[16rem_1fr_8rem_3rem] items-center gap-2 px-2 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  </div>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[16rem_1fr_8rem_3rem] items-center gap-2 px-2 py-3"
                    >
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                      <div className="h-6 w-6 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-7 w-44 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
