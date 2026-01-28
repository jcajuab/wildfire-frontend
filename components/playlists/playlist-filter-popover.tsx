"use client";

import { IconFilter } from "@tabler/icons-react";

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

export type DurationFilter = "all" | "short" | "medium" | "long";

interface PlaylistFilterPopoverProps {
  readonly durationFilter: DurationFilter;
  readonly onDurationFilterChange: (value: DurationFilter) => void;
}

const durationOptions: readonly {
  readonly value: DurationFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All Durations" },
  { value: "short", label: "< 1 min" },
  { value: "medium", label: "1-5 min" },
  { value: "long", label: "> 5 min" },
] as const;

export function PlaylistFilterPopover({
  durationFilter,
  onDurationFilterChange,
}: PlaylistFilterPopoverProps): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default">
          <IconFilter className="size-4" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration-filter" className="text-xs font-medium">
              Duration
            </Label>
            <Select
              value={durationFilter}
              onValueChange={(value) =>
                onDurationFilterChange(value as DurationFilter)
              }
            >
              <SelectTrigger id="duration-filter">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
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
