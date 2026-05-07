import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-3 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>

      {/* Sub-header */}
      <div className="flex shrink-0 border-b border-border">
        {/* Left header */}
        <div className="flex w-56 shrink-0 flex-col gap-3 border-r border-border px-3 py-2">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
        {/* Right header */}
        <div className="flex min-w-0 flex-1 py-2">
          <div className="flex w-1/4 shrink-0 flex-col gap-3 px-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
          <div className="flex flex-1 items-center justify-center px-3">
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="flex w-[14rem] shrink-0 items-center justify-end px-3">
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Two-pane body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left pane */}
        <div className="flex w-56 shrink-0 flex-col border-r border-border">
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-md" />
            ))}
          </div>
        </div>
        {/* Right pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
