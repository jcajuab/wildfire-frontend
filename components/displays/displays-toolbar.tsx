"use client";

import type { ReactElement } from "react";
import {
  IconChevronDown,
  IconDeviceDesktopPlus,
  IconFolderCog,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DisplayOutputFilter } from "@/types/display";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";

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
  readonly search: string;
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly filteredResultsCount: number;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly onStatusFilterChange: (value: DisplayStatusFilter) => void;
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
}

export function DisplaysToolbar({
  statusFilter,
  search,
  selectedGroups,
  selectedOutput,
  filteredResultsCount,
  availableGroups,
  availableOutputs,
  isFetching = false,
  onStatusFilterChange,
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
}: DisplaysToolbarProps): ReactElement {
  const isBulkUnregisterMode = bulkState.mode === "bulk-unregister";
  const canShowActions =
    canCreateDisplay ||
    canManageGroups ||
    (canDeleteDisplay && bulkState.mode === "normal");
  const selectedCount =
    bulkState.mode === "bulk-unregister" ? bulkState.selectedCount : 0;
  const selectedLabel =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  return (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 lg:grid-cols-[1fr_auto_1fr]">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
            Displays
          </h1>

          <div className="flex min-w-0 items-center gap-2 lg:w-[38rem] lg:max-w-[48vw]">
            <SearchControl
              value={search}
              onChange={onSearchChange}
              ariaLabel="Search displays"
              placeholder="Search by display name or slug"
              className="min-w-0 flex-1 max-w-none"
            />
            <DisplayFilterPopover
              statusFilter={statusFilter}
              selectedGroups={selectedGroups}
              selectedOutput={selectedOutput}
              filteredResultsCount={filteredResultsCount}
              availableGroups={availableGroups}
              availableOutputs={availableOutputs}
              isFetching={isFetching}
              onStatusChange={onStatusFilterChange}
              onGroupsChange={onGroupFilterChange}
              onOutputChange={onOutputFilterChange}
              onClearFilters={onClearFilters}
            />
          </div>

          <div className="flex min-w-0 items-center justify-start lg:justify-end">
            {canShowActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center sm:w-auto"
                  >
                    Actions
                    <IconChevronDown
                      className="size-4"
                      aria-hidden="true"
                      data-icon="inline-end"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
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
                      Manage Display Groups
                    </DropdownMenuItem>
                  ) : null}
                  {canDeleteDisplay && bulkState.mode === "normal" ? (
                    <>
                      {canCreateDisplay || canManageGroups ? (
                        <DropdownMenuSeparator />
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={bulkState.onEnterBulkUnregister}
                      >
                        <IconTrashX className="size-4" aria-hidden="true" />
                        Bulk Unregister
                      </DropdownMenuItem>
                    </>
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
                size="sm"
                onClick={bulkState.onDelete}
                disabled={selectedCount === 0}
              >
                <IconTrashX className="size-4" aria-hidden="true" />
                Unregister Selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
