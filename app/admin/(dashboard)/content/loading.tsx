import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <header
        data-testid="content-loading-toolbar"
        className="shrink-0 border-b border-border bg-background p-4"
      >
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
            <div
              data-testid="content-loading-title"
              className="h-6 w-24 animate-pulse rounded-md bg-muted"
            />
            <div
              data-testid="content-loading-search-group"
              className="flex h-7 w-full min-w-0 items-center justify-self-center rounded-md border border-input bg-input/20 md:max-w-168"
            >
              <div
                data-testid="content-loading-search"
                className="ml-8 h-3 min-w-0 flex-1 animate-pulse rounded-md bg-muted"
              />
              <div className="mx-1.5 size-5 shrink-0 animate-pulse rounded-md bg-muted" />
              <div
                data-testid="content-loading-filter"
                className="mr-1 size-6 shrink-0 animate-pulse rounded-md bg-muted"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
              <div
                data-testid="content-loading-bulk-delete"
                className="h-7 w-full animate-pulse rounded-md bg-muted sm:w-24"
              />
              <div
                data-testid="content-loading-create"
                className="h-7 w-full animate-pulse rounded-md bg-muted sm:w-32"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div
            data-testid="content-loading-grid"
            className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                data-testid="content-loading-card"
                className="flex min-h-28 flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="h-5 min-w-0 flex-1 animate-pulse rounded-md bg-muted" />
                  <div className="size-6 shrink-0 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="aspect-video animate-pulse bg-muted/70" />
                <div className="flex flex-col gap-3 p-3 pt-2">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </div>
                  <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer
          data-testid="content-loading-footer"
          className="border-t border-border bg-background/80"
        >
          <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />
            <div className="flex items-center gap-1">
              <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
              <div className="size-7 animate-pulse rounded-md bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
