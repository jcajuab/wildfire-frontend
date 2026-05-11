"use client";

import { memo, type ReactElement } from "react";
import {
  IconChevronDown,
  IconDeviceDesktopPlus,
  IconFolderCog,
  IconSettings,
  IconTrashX,
  IconX,
} from "@tabler/icons-react";

import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { SearchControl } from "@/components/common/search-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DisplayOutputFilter } from "@/types/display";
import type {
  DisplaySortFilter,
  DisplayStatusFilter,
} from "@/components/displays/display-filter-popover";

type DisplaysToolbarBulkState =
  | {
      readonly mode: "normal";
      readonly onEnterBulkUnregister: () => void;
    }
  | {
      readonly mode: "bulk-unregister";
      readonly selectedCount: number;
      readonly onDelete: () => void;
      readonly onCancel: () => void;
    };

interface DisplaysToolbarProps {
  readonly statusFilter: DisplayStatusFilter;
  readonly sortFilter: DisplaySortFilter;
  readonly search: string;
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly filteredResultsCount: number;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly onStatusFilterChange: (value: DisplayStatusFilter) => void;
  readonly onSortFilterChange: (value: DisplaySortFilter) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onGroupFilterChange: (value: readonly string[]) => void;
  readonly onOutputFilterChange: (value: DisplayOutputFilter) => void;
  readonly isFetching?: boolean;
  readonly onClearFilters: () => void;
  readonly canCreateDisplay: boolean;
  readonly canManageGroups: boolean;
  readonly canDeleteDisplay: boolean;
  readonly bulkState: DisplaysToolbarBulkState;
  readonly onRegisterDisplay: () => void;
  readonly onManageGroups: () => void;
  readonly onManageGroupsPrefetch?: () => void;
}

export const DisplaysToolbar = memo(function DisplaysToolbar({
  statusFilter,
  sortFilter,
  search,
  selectedGroups,
  selectedOutput,
  filteredResultsCount,
  availableGroups,
  availableOutputs,
  isFetching = false,
  onStatusFilterChange,
  onSortFilterChange,
  onSearchChange,
  onGroupFilterChange,
  onOutputFilterChange,
  onClearFilters,
  canCreateDisplay,
  canManageGroups,
  canDeleteDisplay,
  bulkState,
  onRegisterDisplay,
  onManageGroups,
  onManageGroupsPrefetch,
}: DisplaysToolbarProps): ReactElement {
  const isBulkUnregisterMode = bulkState.mode === "bulk-unregister";
  const canShowBulkUnregister = canDeleteDisplay && bulkState.mode === "normal";
  const canShowManageDisplays = canCreateDisplay || canManageGroups;
  const selectedCount =
    bulkState.mode === "bulk-unregister" ? bulkState.selectedCount : 0;
  const selectedLabel =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  return (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
            Displays
          </h1>

          <div className="flex w-full min-w-0 items-center justify-self-center md:max-w-168">
            <DisplayFilterPopover
              statusFilter={statusFilter}
              sortFilter={sortFilter}
              selectedGroups={selectedGroups}
              selectedOutput={selectedOutput}
              filteredResultsCount={filteredResultsCount}
              availableGroups={availableGroups}
              availableOutputs={availableOutputs}
              isFetching={isFetching}
              embeddedTrigger
              showOutputFilter={canCreateDisplay}
              renderEmbeddedAnchor={(trigger) => (
                <div className="w-full min-w-0">
                  <SearchControl
                    value={search}
                    onChange={onSearchChange}
                    ariaLabel="Search displays"
                    placeholder="Search by display name or slug"
                    className="max-w-none min-w-0 flex-1"
                    trailingAction={trigger}
                  />
                </div>
              )}
              onStatusChange={onStatusFilterChange}
              onSortChange={onSortFilterChange}
              onGroupsChange={onGroupFilterChange}
              onOutputChange={onOutputFilterChange}
              onClearFilters={onClearFilters}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
            {canShowBulkUnregister ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center border-destructive/30 bg-destructive/5 text-destructive [color:oklch(0.42_0.245_27.325)] hover:bg-destructive/10 hover:text-destructive dark:hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:[color:var(--destructive)] dark:hover:bg-destructive/20 sm:w-auto"
                onClick={bulkState.onEnterBulkUnregister}
              >
                <IconTrashX
                  className="size-4"
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Bulk Unregister
              </Button>
            ) : null}

            {canShowManageDisplays ? (
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) onManageGroupsPrefetch?.();
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    className="w-full justify-center sm:w-auto"
                  >
                    <IconSettings
                      className="size-4"
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Manage Displays
                    <IconChevronDown
                      className="size-4"
                      aria-hidden="true"
                      data-icon="inline-end"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)]"
                >
                  {canCreateDisplay ? (
                    <DropdownMenuItem onClick={onRegisterDisplay}>
                      <IconDeviceDesktopPlus
                        className="size-4"
                        aria-hidden="true"
                      />
                      Register Display
                    </DropdownMenuItem>
                  ) : null}
                  {canManageGroups ? (
                    <DropdownMenuItem onClick={onManageGroups}>
                      <IconFolderCog className="size-4" aria-hidden="true" />
                      Edit Display Groups
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {isBulkUnregisterMode ? (
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
                <IconTrashX className="size-4" aria-hidden="true" />
                Unregister Selected
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
});
