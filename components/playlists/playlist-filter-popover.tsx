"use client";

import type { ReactElement } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { PlaylistStatus } from "@/types/playlist";

export type PlaylistStatusFilter = "all" | PlaylistStatus;

interface PlaylistFilterPopoverProps {
  readonly statusFilter: PlaylistStatusFilter;
  readonly filteredResultsCount: number;
  readonly onStatusFilterChange: (value: PlaylistStatusFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: PlaylistStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_USE", label: "In Use" },
] as const;

export function PlaylistFilterPopover({
  statusFilter,
  filteredResultsCount,
  onStatusFilterChange,
  onClearFilters,
}: PlaylistFilterPopoverProps): ReactElement {
  const hasActiveFilters = statusFilter !== "all";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <IconFilter className="size-4" />
          Filter
          {hasActiveFilters ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {filteredResultsCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        side="bottom"
        align="end"
        avoidCollisions={false}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              <IconX className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="playlist-status-filter"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                onStatusFilterChange(value as PlaylistStatusFilter)
              }
            >
              <SelectTrigger id="playlist-status-filter" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                avoidCollisions={false}
              >
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
