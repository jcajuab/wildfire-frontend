"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserFilterCombobox,
  type UserFilterOption,
} from "@/components/common/user-filter-combobox";
import {
  Popover,
  PopoverAnchor,
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
import { cn } from "@/lib/utils";
import type { PlaylistStatus } from "@/types/playlist";

export type PlaylistStatusFilter = "all" | PlaylistStatus;
export type PlaylistSortFilter =
  | "newest"
  | "oldest"
  | "updated-desc"
  | "name-asc"
  | "name-desc";

export type PlaylistOwnerFilterOption = UserFilterOption;

interface PlaylistFilterPopoverProps {
  readonly statusFilter: PlaylistStatusFilter;
  readonly ownerFilter: string;
  readonly sortFilter: PlaylistSortFilter;
  readonly filteredResultsCount: number;
  readonly ownerOptions?: readonly PlaylistOwnerFilterOption[];
  readonly ownerSearch?: string;
  readonly canFilterByOwner?: boolean;
  readonly isOwnerOptionsFetching?: boolean;
  readonly isFetching?: boolean;
  readonly embeddedTrigger?: boolean;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
  readonly onStatusFilterChange: (value: PlaylistStatusFilter) => void;
  readonly onOwnerSearchChange?: (value: string) => void;
  readonly onOwnerFilterChange: (value: string) => void;
  readonly onSortFilterChange: (value: PlaylistSortFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: PlaylistStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_USE", label: "In use" },
] as const;

const sortOptions: readonly {
  readonly value: PlaylistSortFilter;
  readonly label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
] as const;

interface FilterChipProps {
  readonly label: string;
  readonly onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps): ReactElement {
  return (
    <button
      type="button"
      aria-label={`Remove ${label} filter`}
      className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-border bg-muted/60 px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      onClick={onRemove}
    >
      <span className="truncate">{label}</span>
      <IconX className="size-3 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

export function PlaylistFilterPopover({
  statusFilter,
  ownerFilter,
  sortFilter,
  ownerOptions = [],
  ownerSearch = "",
  canFilterByOwner = false,
  isOwnerOptionsFetching = false,
  isFetching = false,
  embeddedTrigger = false,
  renderEmbeddedAnchor,
  onStatusFilterChange,
  onOwnerSearchChange = () => {},
  onOwnerFilterChange,
  onSortFilterChange,
  onClearFilters,
}: PlaylistFilterPopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  const activeFilterCount =
    (statusFilter === "all" ? 0 : 1) +
    (canFilterByOwner && ownerFilter !== "all" ? 1 : 0) +
    (sortFilter === "newest" ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;
  const activeStatusLabel =
    statusFilter === "all"
      ? null
      : statusOptions.find((option) => option.value === statusFilter)?.label;
  const activeSortLabel =
    sortFilter === "newest"
      ? null
      : sortOptions.find((option) => option.value === sortFilter)?.label;
  const selectedOwner = ownerOptions.find((owner) => owner.id === ownerFilter);
  const activeOwnerLabel =
    canFilterByOwner && ownerFilter !== "all"
      ? selectedOwner
        ? `@${selectedOwner.username}`
        : "Selected user"
      : null;
  const triggerButton = (
    <Button
      variant={embeddedTrigger ? "ghost" : "outline"}
      size={embeddedTrigger ? "icon-sm" : "icon"}
      className={cn(
        "relative",
        embeddedTrigger &&
          "border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-label="Filter playlists"
      aria-expanded={embeddedTrigger ? open : undefined}
      onClick={
        embeddedTrigger ? () => setOpen((current) => !current) : undefined
      }
    >
      <IconFilter className="size-4" aria-hidden="true" />
      {isFetching ? (
        <span className="absolute -right-1 -top-1 size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : hasActiveFilters ? (
        <Badge className="absolute -right-1.5 -top-1.5 h-4 min-w-4 px-1 text-[10px] leading-4">
          {activeFilterCount}
        </Badge>
      ) : null}
    </Button>
  );
  const trigger = embeddedTrigger ? (
    triggerButton
  ) : (
    <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {renderEmbeddedAnchor ? (
        <PopoverAnchor asChild>{renderEmbeddedAnchor(trigger)}</PopoverAnchor>
      ) : (
        trigger
      )}
      <PopoverContent
        className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0"
        side="bottom"
        align="end"
        sideOffset={4}
        avoidCollisions={false}
        aria-label="Playlist filters"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playlist-status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  onStatusFilterChange(value as PlaylistStatusFilter)
                }
              >
                <SelectTrigger id="playlist-status-filter" className="w-full">
                  <SelectValue placeholder="All statuses" />
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playlist-sort-filter">Sort</Label>
              <Select
                value={sortFilter}
                onValueChange={(value) =>
                  onSortFilterChange(value as PlaylistSortFilter)
                }
              >
                <SelectTrigger id="playlist-sort-filter" className="w-full">
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  avoidCollisions={false}
                >
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canFilterByOwner ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="playlist-owner-filter">Created By</Label>
                <UserFilterCombobox
                  id="playlist-owner-filter"
                  value={ownerFilter}
                  options={ownerOptions}
                  inputValue={ownerSearch}
                  isFetching={isOwnerOptionsFetching}
                  onInputValueChange={onOwnerSearchChange}
                  onValueChange={onOwnerFilterChange}
                />
              </div>
            ) : null}
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">
                Active filters
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2"
                onClick={onClearFilters}
              >
                <IconX className="size-3.5" aria-hidden="true" />
                Clear
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeStatusLabel ? (
                <FilterChip
                  label={activeStatusLabel}
                  onRemove={() => onStatusFilterChange("all")}
                />
              ) : null}
              {activeSortLabel ? (
                <FilterChip
                  label={activeSortLabel}
                  onRemove={() => onSortFilterChange("newest")}
                />
              ) : null}
              {activeOwnerLabel ? (
                <FilterChip
                  label={activeOwnerLabel}
                  onRemove={() => onOwnerFilterChange("all")}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
