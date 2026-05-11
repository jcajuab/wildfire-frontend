"use client";

import type { ReactElement } from "react";
import {
  IconBolt,
  IconChevronDown,
  IconFileText,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";

import {
  ContentFilterPopover,
  type ContentOwnerFilterOption,
  type ContentSortFilter,
  type ContentStatusFilter,
  type TypeFilter,
} from "@/components/content/content-filter-popover";
import { SearchControl } from "@/components/common/search-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContentToolbarBulkState =
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

interface ContentToolbarProps {
  readonly statusFilter: ContentStatusFilter;
  readonly typeFilter: TypeFilter;
  readonly ownerFilter: string;
  readonly sortFilter: ContentSortFilter;
  readonly search: string;
  readonly filteredResultsCount: number;
  readonly ownerOptions?: readonly ContentOwnerFilterOption[];
  readonly ownerSearch?: string;
  readonly canFilterByOwner?: boolean;
  readonly isOwnerOptionsFetching?: boolean;
  readonly isFetching?: boolean;
  readonly canCreateContent: boolean;
  readonly canDeleteContent: boolean;
  readonly bulkState: ContentToolbarBulkState;
  readonly onSearchChange: (value: string) => void;
  readonly onStatusFilterChange: (value: ContentStatusFilter) => void;
  readonly onTypeFilterChange: (value: TypeFilter) => void;
  readonly onOwnerSearchChange?: (value: string) => void;
  readonly onOwnerFilterChange: (value: string) => void;
  readonly onSortFilterChange: (value: ContentSortFilter) => void;
  readonly onClearFilters: () => void;
  readonly onCreateText: () => void;
  readonly onCreateUpload: () => void;
  readonly onCreateFlash: () => void;
}

export function ContentToolbar({
  statusFilter,
  typeFilter,
  ownerFilter,
  sortFilter,
  search,
  filteredResultsCount,
  ownerOptions = [],
  ownerSearch = "",
  canFilterByOwner = false,
  isOwnerOptionsFetching = false,
  isFetching = false,
  canCreateContent,
  canDeleteContent,
  bulkState,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onOwnerSearchChange,
  onOwnerFilterChange,
  onSortFilterChange,
  onClearFilters,
  onCreateText,
  onCreateUpload,
  onCreateFlash,
}: ContentToolbarProps): ReactElement {
  const isBulkDeleteMode = bulkState.mode === "bulk-delete";
  const canShowBulkDelete = canDeleteContent && bulkState.mode === "normal";
  const selectedCount =
    bulkState.mode === "bulk-delete" ? bulkState.selectedCount : 0;
  const selectedLabel =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  return (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
            Content
          </h1>

          <div className="flex w-full min-w-0 items-center justify-self-center md:max-w-168">
            <ContentFilterPopover
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              ownerFilter={ownerFilter}
              sortFilter={sortFilter}
              filteredResultsCount={filteredResultsCount}
              ownerOptions={ownerOptions}
              ownerSearch={ownerSearch}
              canFilterByOwner={canFilterByOwner}
              isOwnerOptionsFetching={isOwnerOptionsFetching}
              isFetching={isFetching}
              embeddedTrigger
              renderEmbeddedAnchor={(trigger) => (
                <div className="w-full min-w-0">
                  <SearchControl
                    value={search}
                    onChange={onSearchChange}
                    ariaLabel="Search content"
                    placeholder="Search by content title"
                    className="max-w-none min-w-0 flex-1"
                    trailingAction={trigger}
                  />
                </div>
              )}
              onStatusFilterChange={onStatusFilterChange}
              onTypeFilterChange={onTypeFilterChange}
              onOwnerSearchChange={onOwnerSearchChange}
              onOwnerFilterChange={onOwnerFilterChange}
              onSortFilterChange={onSortFilterChange}
              onClearFilters={onClearFilters}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
            {canShowBulkDelete ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center border-destructive/30 bg-destructive/5 text-destructive [color:oklch(0.42_0.245_27.325)] hover:bg-destructive/10 hover:text-destructive dark:hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:[color:var(--destructive)] dark:hover:bg-destructive/20 sm:w-auto"
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

            {canCreateContent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    className="w-full justify-center sm:w-auto"
                  >
                    <IconPlus
                      className="size-4"
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Create Content
                    <IconChevronDown
                      className="size-4"
                      aria-hidden="true"
                      data-icon="inline-end"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)]"
                >
                  <DropdownMenuItem onClick={onCreateText}>
                    <IconFileText className="size-4" aria-hidden="true" />
                    Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateUpload}>
                    <IconUpload className="size-4" aria-hidden="true" />
                    Upload
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateFlash}>
                    <IconBolt className="size-4" aria-hidden="true" />
                    Flash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
