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
import type { ContentStatus, ContentType } from "@/types/content";

export type TypeFilter = "all" | ContentType;
export type ContentStatusFilter = "all" | ContentStatus;

interface ContentFilterPopoverProps {
  readonly statusFilter: ContentStatusFilter;
  readonly typeFilter: TypeFilter;
  readonly filteredResultsCount: number;
  readonly onStatusFilterChange: (value: ContentStatusFilter) => void;
  readonly onTypeFilterChange: (value: TypeFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: ContentStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
] as const;

const typeOptions: readonly {
  readonly value: TypeFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All Types" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
  { value: "PDF", label: "Documents" },
  { value: "FLASH", label: "Flash Text" },
  { value: "TEXT", label: "Rich Text" },
] as const;

export function ContentFilterPopover({
  statusFilter,
  typeFilter,
  filteredResultsCount,
  onStatusFilterChange,
  onTypeFilterChange,
  onClearFilters,
}: ContentFilterPopoverProps): ReactElement {
  const activeFilterCount =
    (statusFilter === "all" ? 0 : 1) + (typeFilter === "all" ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;

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

          <div className="flex flex-row flex-wrap gap-3">
            <div className="flex min-w-36 flex-1 flex-col gap-1.5">
              <Label
                htmlFor="content-status-filter"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  onStatusFilterChange(value as ContentStatusFilter)
                }
              >
                <SelectTrigger id="content-status-filter" className="w-full">
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

            <div className="flex min-w-36 flex-1 flex-col gap-1.5">
              <Label
                htmlFor="type-filter"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Type
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  onTypeFilterChange(value as TypeFilter)
                }
              >
                <SelectTrigger id="type-filter" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  avoidCollisions={false}
                >
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
