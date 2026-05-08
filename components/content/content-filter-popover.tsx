"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { ContentStatus, ContentType } from "@/types/content";

export type TypeFilter = "all" | ContentType;
export type ContentStatusFilter = "all" | ContentStatus;
export type ContentSortFilter =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "file-size-desc"
  | "file-size-asc";

export type ContentOwnerFilterOption = UserFilterOption;

interface ContentFilterPopoverProps {
  readonly statusFilter: ContentStatusFilter;
  readonly typeFilter: TypeFilter;
  readonly ownerFilter: string;
  readonly sortFilter: ContentSortFilter;
  readonly filteredResultsCount: number;
  readonly ownerOptions?: readonly ContentOwnerFilterOption[];
  readonly ownerSearch?: string;
  readonly canFilterByOwner?: boolean;
  readonly isOwnerOptionsFetching?: boolean;
  readonly isFetching?: boolean;
  readonly embeddedTrigger?: boolean;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
  readonly onStatusFilterChange: (value: ContentStatusFilter) => void;
  readonly onTypeFilterChange: (value: TypeFilter) => void;
  readonly onOwnerSearchChange?: (value: string) => void;
  readonly onOwnerFilterChange: (value: string) => void;
  readonly onSortFilterChange: (value: ContentSortFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: ContentStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
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

const typeOptions: readonly {
  readonly value: TypeFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All content types" },
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
  { value: "FLASH", label: "Flash" },
] as const;

const sortOptions: readonly {
  readonly value: ContentSortFilter;
  readonly label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "file-size-desc", label: "Largest file" },
  { value: "file-size-asc", label: "Smallest file" },
] as const;

export function ContentFilterPopover({
  statusFilter,
  typeFilter,
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
  onTypeFilterChange,
  onOwnerSearchChange = () => {},
  onOwnerFilterChange,
  onSortFilterChange,
  onClearFilters,
}: ContentFilterPopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  const activeFilterCount =
    (statusFilter === "all" ? 0 : 1) +
    (typeFilter === "all" ? 0 : 1) +
    (canFilterByOwner && ownerFilter !== "all" ? 1 : 0) +
    (sortFilter === "newest" ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;
  const activeStatusLabel =
    statusFilter === "all"
      ? null
      : statusOptions.find((option) => option.value === statusFilter)?.label;
  const activeTypeLabel =
    typeFilter === "all"
      ? null
      : typeOptions.find((option) => option.value === typeFilter)?.label;
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
      aria-label="Filter content"
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
        aria-label="Content filters"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-36 flex-1 flex-col gap-1.5">
              <Label htmlFor="content-status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  onStatusFilterChange(value as ContentStatusFilter)
                }
              >
                <SelectTrigger id="content-status-filter" className="w-full">
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

            <div className="flex min-w-36 flex-1 flex-col gap-1.5">
              <Label htmlFor="content-sort-filter">Sort</Label>
              <Select
                value={sortFilter}
                onValueChange={(value) =>
                  onSortFilterChange(value as ContentSortFilter)
                }
              >
                <SelectTrigger id="content-sort-filter" className="w-full">
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

            <div
              className={cn(
                "flex min-w-36 flex-1 flex-col gap-1.5 sm:col-span-2",
              )}
            >
              <Label htmlFor="type-filter">Content Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  onTypeFilterChange(value as TypeFilter)
                }
              >
                <SelectTrigger id="type-filter" className="w-full">
                  <SelectValue placeholder="All content types" />
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

            {canFilterByOwner ? (
              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="content-owner-filter">Created By</Label>
                <UserFilterCombobox
                  id="content-owner-filter"
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
              {activeTypeLabel ? (
                <FilterChip
                  label={activeTypeLabel}
                  onRemove={() => onTypeFilterChange("all")}
                />
              ) : null}
              {activeOwnerLabel ? (
                <FilterChip
                  label={activeOwnerLabel}
                  onRemove={() => onOwnerFilterChange("all")}
                />
              ) : null}
              {activeSortLabel ? (
                <FilterChip
                  label={activeSortLabel}
                  onRemove={() => onSortFilterChange("newest")}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
