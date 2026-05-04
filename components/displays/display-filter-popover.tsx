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
  readonly onStatusChange: (nextStatus: DisplayStatusFilter) => void;
  readonly onGroupsChange: (nextGroups: readonly string[]) => void;
  readonly onOutputChange: (nextOutput: DisplayOutputFilter) => void;
  readonly onClearFilters: () => void;
}

const statusOptions: readonly {
  readonly value: DisplayStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "LIVE", label: "Live" },
  { value: "DOWN", label: "Down" },
] as const;

export function DisplayFilterPopover({
  statusFilter,
  selectedGroups,
  selectedOutput,
  filteredResultsCount,
  availableGroups,
  availableOutputs,
  isFetching = false,
  onStatusChange,
  onGroupsChange,
  onOutputChange,
  onClearFilters,
}: DisplayFilterPopoverProps): ReactElement {
  const activeFilterCount =
    selectedGroups.length +
    (selectedOutput === "all" ? 0 : 1) +
    (statusFilter === "all" ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <IconFilter className="size-4" aria-hidden="true" />
          <span>Filter</span>
          {isFetching ? (
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : hasActiveFilters ? (
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
              htmlFor="display-status-filter"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(nextValue) =>
                onStatusChange(nextValue as DisplayStatusFilter)
              }
            >
              <SelectTrigger id="display-status-filter" className="w-full">
                <SelectValue placeholder="All" />
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

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="display-output-filter"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Output
            </Label>
            <Select
              value={selectedOutput}
              onValueChange={(nextValue) =>
                onOutputChange(nextValue as DisplayOutputFilter)
              }
            >
              <SelectTrigger id="display-output-filter" className="w-full">
                <SelectValue placeholder="All Outputs" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                avoidCollisions={false}
              >
                <SelectItem value="all">All Outputs</SelectItem>
                {availableOutputs.map((outputName) => (
                  <SelectItem key={outputName} value={outputName}>
                    {outputName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Groups
            </p>
            {availableGroups.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                No groups available.
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
                    placeholder={
                      selectedGroups.length === 0 ? "Search groups…" : ""
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
      </PopoverContent>
    </Popover>
  );
}
