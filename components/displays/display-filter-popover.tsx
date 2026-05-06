"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DISPLAY_OUTPUT_TYPES,
  getDisplayOutputFilterLabel,
  normalizeDisplayOutputFilter,
  toDisplayOutputTypeFilter,
} from "@/lib/display-output";
import { cn } from "@/lib/utils";
import type { DisplayOutputFilter, DisplayStatus } from "@/types/display";

export type DisplayStatusFilter = "all" | DisplayStatus;

interface DisplayFilterPopoverProps {
  readonly statusFilter: DisplayStatusFilter;
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly filteredResultsCount: number;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly isFetching?: boolean;
  readonly embeddedTrigger?: boolean;
  readonly showOutputFilter?: boolean;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
  readonly onStatusChange: (nextStatus: DisplayStatusFilter) => void;
  readonly onGroupsChange: (nextGroups: readonly string[]) => void;
  readonly onOutputChange: (nextOutput: DisplayOutputFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: DisplayStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "READY", label: "Ready" },
  { value: "LIVE", label: "Live" },
  { value: "DOWN", label: "Down" },
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

export function DisplayFilterPopover({
  statusFilter,
  selectedGroups,
  selectedOutput,
  availableGroups,
  availableOutputs,
  isFetching = false,
  embeddedTrigger = false,
  showOutputFilter = true,
  renderEmbeddedAnchor,
  onStatusChange,
  onGroupsChange,
  onOutputChange,
  onClearFilters,
}: DisplayFilterPopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  const activeFilterCount =
    selectedGroups.length +
    (showOutputFilter && selectedOutput !== "all" ? 1 : 0) +
    (statusFilter === "all" ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;
  const activeStatusLabel =
    statusFilter === "all"
      ? null
      : statusOptions.find((option) => option.value === statusFilter)?.label;
  const outputTypeOptions = useMemo(() => {
    const values = new Set<DisplayOutputFilter>();

    for (const output of availableOutputs) {
      const normalized = normalizeDisplayOutputFilter(output);
      if (normalized !== "all") {
        values.add(normalized);
      }
    }

    for (const type of DISPLAY_OUTPUT_TYPES) {
      values.add(toDisplayOutputTypeFilter(type));
    }

    return DISPLAY_OUTPUT_TYPES.map((type) => {
      const value = toDisplayOutputTypeFilter(type);
      return {
        value,
        label: value,
      };
    }).filter((option) => values.has(option.value));
  }, [availableOutputs]);

  const anchorRef = useComboboxAnchor();
  const [groupSearchValue, setGroupSearchValue] = useState("");
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    const trimmed = groupSearchValue.trim().toLowerCase();
    if (!trimmed) return availableGroups;
    return availableGroups.filter((g) => g.toLowerCase().includes(trimmed));
  }, [availableGroups, groupSearchValue]);

  const handleGroupsValueChange = useCallback(
    (next: unknown) => {
      const nextArr = Array.isArray(next) ? (next as string[]) : [];
      onGroupsChange(nextArr);
      setGroupSearchValue("");
    },
    [onGroupsChange],
  );

  const handleRemoveGroup = useCallback(
    (groupName: string) => {
      onGroupsChange(selectedGroups.filter((name) => name !== groupName));
    },
    [onGroupsChange, selectedGroups],
  );
  const triggerButton = (
    <Button
      variant={embeddedTrigger ? "ghost" : "outline"}
      size={embeddedTrigger ? "icon-sm" : "icon"}
      className={cn(
        "relative",
        embeddedTrigger &&
          "border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-label="Filter displays"
      aria-expanded={embeddedTrigger ? open : undefined}
      onClick={
        embeddedTrigger ? () => setOpen((current) => !current) : undefined
      }
    >
      <IconFilter className="size-4" aria-hidden="true" />
      {isFetching ? (
        <span className="absolute -right-1 -top-1 size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : hasActiveFilters ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums">
          {activeFilterCount}
        </span>
      ) : null}
    </Button>
  );
  const trigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        {embeddedTrigger ? (
          triggerButton
        ) : (
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        )}
      </TooltipTrigger>
      <TooltipContent>Filter</TooltipContent>
    </Tooltip>
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
        aria-label="Display filters"
      >
        <div className="flex flex-col gap-4 p-4">
          <div
            className={cn(
              "grid gap-4",
              showOutputFilter ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display-status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(nextValue) =>
                  onStatusChange(nextValue as DisplayStatusFilter)
                }
              >
                <SelectTrigger id="display-status-filter" className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  avoidCollisions={false}
                >
                  {statusOptions.map((statusOption) => (
                    <SelectItem
                      key={statusOption.value}
                      value={statusOption.value}
                    >
                      {statusOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showOutputFilter ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="display-output-filter">Output Type</Label>
                <Select
                  value={selectedOutput}
                  onValueChange={(nextValue) =>
                    onOutputChange(
                      normalizeDisplayOutputFilter(
                        nextValue,
                      ) as DisplayOutputFilter,
                    )
                  }
                >
                  <SelectTrigger id="display-output-filter" className="w-full">
                    <SelectValue placeholder="All output types" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    avoidCollisions={false}
                  >
                    <SelectItem value="all">All output types</SelectItem>
                    {outputTypeOptions.map((outputOption) => (
                      <SelectItem
                        key={outputOption.value}
                        value={outputOption.value}
                      >
                        {outputOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="display-group-filter">Display Groups</Label>
            {availableGroups.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                No display groups available.
              </p>
            ) : (
              <Combobox
                multiple
                value={selectedGroups as string[]}
                items={availableGroups as string[]}
                filteredItems={filteredGroups as string[]}
                onValueChange={handleGroupsValueChange}
                inputValue={groupSearchValue}
                onInputValueChange={(v) => setGroupSearchValue(v ?? "")}
                open={groupComboOpen}
                onOpenChange={(next) => setGroupComboOpen(next)}
              >
                <ComboboxChips ref={anchorRef}>
                  {selectedGroups.map((name) => (
                    <ComboboxChip key={name}>
                      <span className="inline-flex rounded px-1 text-xs font-medium bg-primary/15 text-foreground">
                        {name}
                      </span>
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    id="display-group-filter"
                    placeholder={
                      selectedGroups.length === 0 ? "Search display groups" : ""
                    }
                    onFocus={() => setGroupComboOpen(true)}
                    onClick={() => setGroupComboOpen(true)}
                  />
                </ComboboxChips>
                <ComboboxContent anchor={anchorRef}>
                  <ComboboxList>
                    {filteredGroups.map((name) => (
                      <ComboboxItem key={name} value={name}>
                        {name}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>No groups found.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            )}
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
                  onRemove={() => onStatusChange("all")}
                />
              ) : null}
              {showOutputFilter && selectedOutput !== "all" ? (
                <FilterChip
                  label={getDisplayOutputFilterLabel(selectedOutput)}
                  onRemove={() => onOutputChange("all")}
                />
              ) : null}
              {selectedGroups.map((name) => (
                <FilterChip
                  key={name}
                  label={name}
                  onRemove={() => handleRemoveGroup(name)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
