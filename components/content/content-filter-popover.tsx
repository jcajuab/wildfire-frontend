"use client";

import type { ReactElement } from "react";
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
import type { ContentType } from "@/types/content";

export type TypeFilter = "all" | ContentType;

interface ContentFilterPopoverProps {
  readonly typeFilter: TypeFilter;
  readonly onTypeFilterChange: (value: TypeFilter) => void;
}

const typeOptions: readonly {
  readonly value: TypeFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All Types" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
  { value: "PDF", label: "Documents" },
] as const;

export function ContentFilterPopover({
  typeFilter,
  onTypeFilterChange,
}: ContentFilterPopoverProps): ReactElement {
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
            <Label htmlFor="type-filter" className="text-xs font-medium">
              Content Type
            </Label>
            <Select
              value={typeFilter}
              onValueChange={(value) => onTypeFilterChange(value as TypeFilter)}
            >
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
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
