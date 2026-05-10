"use client";

import type { ReactElement } from "react";
import {
  IconBolt,
  IconChevronDown,
  IconList,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { SearchControl } from "@/components/common/search-control";
import { ScheduleFilterPopover } from "@/components/schedules/schedule-filter-popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DisplayGroupSortField,
  ResourceMode,
  ScheduleTimeFilter,
  ScheduleTypeFilter,
} from "@/types/schedule";

type SchedulesToolbarBulkState =
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

interface SchedulesToolbarProps {
  readonly search: string;
  readonly resourceMode: ResourceMode;
  readonly displayGroupSort: DisplayGroupSortField;
  readonly scheduleTypeFilter: ScheduleTypeFilter;
  readonly timeFilter: ScheduleTimeFilter;
  readonly targetResourceId: string | null;
  readonly targetResourceOptions: readonly { id: string; name: string }[];
  readonly canCreateSchedule: boolean;
  readonly canDeleteSchedule: boolean;
  readonly bulkState: SchedulesToolbarBulkState;
  readonly onSearchChange: (value: string) => void;
  readonly onDisplayGroupSortChange: (sort: DisplayGroupSortField) => void;
  readonly onScheduleTypeFilterChange: (type: ScheduleTypeFilter) => void;
  readonly onTimeFilterChange: (time: ScheduleTimeFilter) => void;
  readonly onTargetResourceChange: (id: string | null) => void;
  readonly onClearFilters: () => void;
  readonly onCreatePlaylistSchedule: () => void;
  readonly onCreateFlashSchedule: () => void;
}

export function SchedulesToolbar({
  search,
  resourceMode,
  displayGroupSort,
  scheduleTypeFilter,
  timeFilter,
  targetResourceId,
  targetResourceOptions,
  canCreateSchedule,
  canDeleteSchedule,
  bulkState,
  onSearchChange,
  onDisplayGroupSortChange,
  onScheduleTypeFilterChange,
  onTimeFilterChange,
  onTargetResourceChange,
  onClearFilters,
  onCreatePlaylistSchedule,
  onCreateFlashSchedule,
}: SchedulesToolbarProps): ReactElement {
  const isBulkDeleteMode = bulkState.mode === "bulk-delete";
  const canShowBulkDelete = canDeleteSchedule && bulkState.mode === "normal";
  const selectedCount =
    bulkState.mode === "bulk-delete" ? bulkState.selectedCount : 0;
  const selectedLabel =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  return (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
            Schedules
          </h1>

          <div className="flex w-full min-w-0 items-center justify-self-center md:max-w-168">
            <ScheduleFilterPopover
              resourceMode={resourceMode}
              displayGroupSort={displayGroupSort}
              onDisplayGroupSortChange={onDisplayGroupSortChange}
              scheduleTypeFilter={scheduleTypeFilter}
              onScheduleTypeFilterChange={onScheduleTypeFilterChange}
              timeFilter={timeFilter}
              onTimeFilterChange={onTimeFilterChange}
              targetResourceId={targetResourceId}
              targetResourceOptions={targetResourceOptions}
              onTargetResourceChange={onTargetResourceChange}
              onClearFilters={onClearFilters}
              embeddedTrigger
              renderEmbeddedAnchor={(trigger) => (
                <div className="w-full min-w-0">
                  <SearchControl
                    value={search}
                    onChange={onSearchChange}
                    ariaLabel="Search schedules"
                    placeholder="Search by schedule, display, or content"
                    className="max-w-none min-w-0 flex-1"
                    trailingAction={trigger}
                  />
                </div>
              )}
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

            {canCreateSchedule ? (
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
                    Create Schedule
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
                  <DropdownMenuItem onClick={onCreatePlaylistSchedule}>
                    <IconList className="size-4" aria-hidden="true" />
                    Playlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateFlashSchedule}>
                    <IconBolt className="size-4" aria-hidden="true" />
                    Flash Overlay
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
