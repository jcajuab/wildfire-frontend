"use client";

import type { ReactElement } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import type { DisplayOutputFilter } from "@/types/display";

interface DisplayFilterPopoverProps {
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly onGroupsChange: (nextGroups: readonly string[]) => void;
  readonly onOutputChange: (nextOutput: DisplayOutputFilter) => void;
  readonly onClearFilters: () => void;
}

export function DisplayFilterPopover({
  selectedGroups,
  selectedOutput,
  availableGroups,
  availableOutputs,
  onGroupsChange,
  onOutputChange,
  onClearFilters,
}: DisplayFilterPopoverProps): ReactElement {
  const activeFilterCount =
    selectedGroups.length + (selectedOutput === "all" ? 0 : 1);

  const toggleGroup = (groupName: string, checked: boolean): void => {
    if (checked) {
      onGroupsChange([...selectedGroups, groupName]);
      return;
    }
    onGroupsChange(
      selectedGroups.filter((selectedGroup) => selectedGroup !== groupName),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <IconFilter className="size-4" aria-hidden="true" />
          <span>Filter</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
            >
              <IconX className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="display-output-filter"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Display Output
            </Label>
            <Select
              value={selectedOutput}
              onValueChange={(nextValue) =>
                onOutputChange(nextValue as DisplayOutputFilter)
              }
            >
              <SelectTrigger id="display-output-filter">
                <SelectValue placeholder="All Outputs" />
              </SelectTrigger>
              <SelectContent>
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
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {availableGroups.map((groupName, index) => {
                  const checkboxId = `display-group-filter-${index}`;
                  const isChecked = selectedGroups.includes(groupName);

                  return (
                    <label
                      key={groupName}
                      htmlFor={checkboxId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none",
                        isChecked
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border/70 hover:border-primary/30 hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          toggleGroup(groupName, checked === true)
                        }
                        aria-label={`Filter by group ${groupName}`}
                      />
                      <span className="min-w-0 truncate">{groupName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
