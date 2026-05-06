import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <header
        data-testid="playlists-loading-toolbar"
        className="shrink-0 border-b border-border bg-background p-4"
      >
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
            <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
            <div
              data-testid="playlists-loading-search-group"
              className="flex h-7 w-full min-w-0 items-center justify-self-center rounded-md border border-input bg-input/20 md:max-w-168"
            >
              <div className="ml-8 h-3 min-w-0 flex-1 animate-pulse rounded-md bg-muted" />
              <div className="mx-1.5 size-5 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="mr-1 size-6 shrink-0 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
              <div className="h-7 w-full animate-pulse rounded-md bg-muted sm:w-24" />
              <div className="h-7 w-full animate-pulse rounded-md bg-muted sm:w-32" />
            </div>
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div
            data-testid="playlists-loading-grid"
            className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                data-testid="playlists-loading-card"
                className="flex h-[220px] flex-col gap-3 rounded-xl border border-border/80 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
                  </div>
                  <div className="size-7 shrink-0 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="flex gap-2">
                  <div className="h-16 w-20 animate-pulse rounded-md bg-muted" />
                  <div className="h-16 w-20 animate-pulse rounded-md bg-muted" />
                  <div className="h-16 w-20 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="mt-auto h-4 w-44 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <footer
          data-testid="playlists-loading-footer"
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
