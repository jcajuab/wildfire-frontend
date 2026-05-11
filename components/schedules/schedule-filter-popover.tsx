"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxVirtualList,
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
import { cn } from "@/lib/utils";
import type {
  DisplayGroupSortField,
  ResourceMode,
  ScheduleTypeFilter,
} from "@/types/schedule";

interface ScheduleFilterPopoverProps {
  readonly resourceMode: ResourceMode;
  readonly displayGroupSort: DisplayGroupSortField;
  readonly onDisplayGroupSortChange: (sort: DisplayGroupSortField) => void;
  readonly scheduleTypeFilter: ScheduleTypeFilter;
  readonly onScheduleTypeFilterChange: (type: ScheduleTypeFilter) => void;
  readonly targetResourceIds: string[];
  readonly targetResourceOptions: readonly { id: string; name: string }[];
  readonly onTargetResourceChange: (ids: string[]) => void;
  readonly embeddedTrigger?: boolean;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
  readonly onClearFilters: () => void;
}

const scheduleTypeOptions: readonly {
  readonly value: ScheduleTypeFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All schedule types" },
  { value: "playlist", label: "Playlist schedules" },
  { value: "flash", label: "Flash overlays" },
];

const displayGroupSortOptions: readonly {
  readonly value: DisplayGroupSortField;
  readonly label: string;
}[] = [
  { value: "alphabetical", label: "Name A-Z" },
  { value: "display-count", label: "Display count" },
];

interface FilterChipProps {
  readonly label: string;
  readonly onRemove: () => void;
}

interface TargetResourceComboboxProps {
  readonly resourceMode: ResourceMode;
  readonly value: string[];
  readonly options: readonly { id: string; name: string }[];
  readonly onChange: (ids: string[]) => void;
}

function TargetResourceCombobox({
  resourceMode,
  value,
  options,
  onChange,
}: TargetResourceComboboxProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const label =
    resourceMode === "display" ? "Target Displays" : "Target Display Groups";
  const placeholder =
    resourceMode === "display" ? "Search displays" : "Search display groups";
  const emptyLabel =
    resourceMode === "display"
      ? "No displays found."
      : "No display groups found.";

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(query),
    );
  }, [inputValue, options]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
      <Label htmlFor="schedule-target-filter">{label}</Label>
      <Combobox
        multiple
        value={value}
        items={options.map((option) => option.id)}
        filteredItems={filteredOptions.map((option) => option.id)}
        inputValue={inputValue}
        onValueChange={(nextValue) => {
          onChange(Array.isArray(nextValue) ? (nextValue as string[]) : []);
          setInputValue("");
        }}
        onInputValueChange={(nextValue) => setInputValue(nextValue ?? "")}
      >
        <ComboboxChips ref={anchorRef}>
          {value.map((id) => (
            <ComboboxChip key={id}>
              {optionsById.get(id)?.name ?? id}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            id="schedule-target-filter"
            aria-label={label}
            placeholder={value.length === 0 ? placeholder : ""}
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef}>
          <ComboboxVirtualList
            items={filteredOptions}
            getItemKey={(option) => option.id}
            renderItem={(option) => (
              <ComboboxItem value={option.id}>{option.name}</ComboboxItem>
            )}
          />
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
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

export function ScheduleFilterPopover({
  resourceMode,
  displayGroupSort,
  onDisplayGroupSortChange,
  scheduleTypeFilter,
  onScheduleTypeFilterChange,
  targetResourceIds,
  targetResourceOptions,
  onTargetResourceChange,
  embeddedTrigger = false,
  renderEmbeddedAnchor,
  onClearFilters,
}: ScheduleFilterPopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  const hasTypeFilter = scheduleTypeFilter !== "all";
  const hasTargetFilter = targetResourceIds.length > 0;
  const hasSortFilter =
    resourceMode === "display-group" && displayGroupSort !== "alphabetical";
  const activeFilterCount =
    (hasTypeFilter ? 1 : 0) +
    targetResourceIds.length +
    (hasSortFilter ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const activeTypeLabel = hasTypeFilter
    ? scheduleTypeOptions.find((option) => option.value === scheduleTypeFilter)
        ?.label
    : null;
  const activeSortLabel = hasSortFilter
    ? displayGroupSortOptions.find(
        (option) => option.value === displayGroupSort,
      )?.label
    : null;
  const targetOptionsById = useMemo(
    () => new Map(targetResourceOptions.map((option) => [option.id, option])),
    [targetResourceOptions],
  );

  const triggerButton = (
    <Button
      variant={embeddedTrigger ? "ghost" : "outline"}
      size={embeddedTrigger ? "icon-sm" : "default"}
      className={cn(
        "relative",
        embeddedTrigger &&
          "border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        !embeddedTrigger && "gap-2",
      )}
      aria-label="Filter schedules"
      aria-expanded={embeddedTrigger ? open : undefined}
      onClick={
        embeddedTrigger ? () => setOpen((current) => !current) : undefined
      }
    >
      <IconFilter className="size-4" aria-hidden="true" />
      {!embeddedTrigger ? <span>Filter</span> : null}
      {hasActiveFilters ? (
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
        aria-label="Schedule filters"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-36 flex-1 flex-col gap-1.5">
              <Label htmlFor="schedule-type-filter">Schedule Type</Label>
              <Select
                value={scheduleTypeFilter}
                onValueChange={(value) =>
                  onScheduleTypeFilterChange(value as ScheduleTypeFilter)
                }
              >
                <SelectTrigger id="schedule-type-filter" className="w-full">
                  <SelectValue placeholder="All schedule types" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  avoidCollisions={false}
                >
                  {scheduleTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resourceMode === "display-group" ? (
              <div className="flex min-w-36 flex-1 flex-col gap-1.5">
                <Label htmlFor="schedule-display-group-sort-filter">
                  Display Group Sort
                </Label>
                <Select
                  value={displayGroupSort}
                  onValueChange={(value) =>
                    onDisplayGroupSortChange(value as DisplayGroupSortField)
                  }
                >
                  <SelectTrigger
                    id="schedule-display-group-sort-filter"
                    className="w-full"
                  >
                    <SelectValue placeholder="Name A-Z" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    avoidCollisions={false}
                  >
                    {displayGroupSortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <TargetResourceCombobox
              resourceMode={resourceMode}
              value={targetResourceIds}
              options={targetResourceOptions}
              onChange={onTargetResourceChange}
            />
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
              {activeTypeLabel ? (
                <FilterChip
                  label={activeTypeLabel}
                  onRemove={() => onScheduleTypeFilterChange("all")}
                />
              ) : null}
              {hasTargetFilter
                ? targetResourceIds.map((targetResourceId) => (
                    <FilterChip
                      key={targetResourceId}
                      label={
                        targetOptionsById.get(targetResourceId)?.name ??
                        targetResourceId
                      }
                      onRemove={() =>
                        onTargetResourceChange(
                          targetResourceIds.filter(
                            (id) => id !== targetResourceId,
                          ),
                        )
                      }
                    />
                  ))
                : null}
              {activeSortLabel ? (
                <FilterChip
                  label={activeSortLabel}
                  onRemove={() => onDisplayGroupSortChange("alphabetical")}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
