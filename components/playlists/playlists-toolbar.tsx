"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";

import { SearchControl } from "@/components/common/search-control";
import {
  PlaylistFilterPopover,
  type PlaylistStatusFilter,
} from "@/components/playlists/playlist-filter-popover";
import { Button } from "@/components/ui/button";

type PlaylistsToolbarBulkState =
  | {
      readonly mode: "normal";
      readonly onEnterBulkDelete: () => void;
    }
  | {
      readonly mode: "bulk-delete";
      readonly selectedCount: number;
      readonly onDelete: () => void;
      readonly onCancel: () => void;
    };

interface PlaylistsToolbarProps {
  readonly statusFilter: PlaylistStatusFilter;
  readonly search: string;
  readonly filteredResultsCount: number;
  readonly isFetching?: boolean;
  readonly canCreatePlaylist: boolean;
  readonly canDeletePlaylist: boolean;
  readonly bulkState: PlaylistsToolbarBulkState;
  readonly onSearchChange: (value: string) => void;
  readonly onStatusFilterChange: (value: PlaylistStatusFilter) => void;
  readonly onClearFilters: () => void;
}

export function PlaylistsToolbar({
  statusFilter,
  search,
  filteredResultsCount,
  isFetching = false,
  canCreatePlaylist,
  canDeletePlaylist,
  bulkState,
  onSearchChange,
  onStatusFilterChange,
  onClearFilters,
}: PlaylistsToolbarProps): ReactElement {
  const isBulkDeleteMode = bulkState.mode === "bulk-delete";
  const canShowBulkDelete = canDeletePlaylist && bulkState.mode === "normal";
  const selectedCount =
    bulkState.mode === "bulk-delete" ? bulkState.selectedCount : 0;
  const selectedLabel =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  return (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
            Playlists
          </h1>

          <div className="flex w-full min-w-0 items-center justify-self-center md:max-w-168">
            <PlaylistFilterPopover
              statusFilter={statusFilter}
              filteredResultsCount={filteredResultsCount}
              isFetching={isFetching}
              embeddedTrigger
              renderEmbeddedAnchor={(trigger) => (
                <div className="w-full min-w-0">
                  <SearchControl
                    value={search}
                    onChange={onSearchChange}
                    ariaLabel="Search playlists"
                    placeholder="Search by playlist name"
                    className="max-w-none min-w-0 flex-1"
                    trailingAction={trigger}
                  />
                </div>
              )}
              onStatusFilterChange={onStatusFilterChange}
              onClearFilters={onClearFilters}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
            {canShowBulkDelete ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:hover:bg-destructive/20 sm:w-auto"
                onClick={bulkState.onEnterBulkDelete}
              >
                <IconTrash
                  className="size-4"
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Bulk Delete
              </Button>
            ) : null}

            {canCreatePlaylist ? (
              <Button asChild className="w-full justify-center sm:w-auto">
                <Link href="/admin/playlists/create">
                  Create Playlist
                  <IconPlus
                    className="size-4"
                    aria-hidden="true"
                    data-icon="inline-end"
                  />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {isBulkDeleteMode ? (
          <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-foreground tabular-nums">
              {selectedLabel}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={bulkState.onDelete}
                disabled={selectedCount === 0}
              >
                <IconTrash className="size-4" aria-hidden="true" />
                Delete Selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={bulkState.onCancel}
              >
                <IconX className="size-4" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
