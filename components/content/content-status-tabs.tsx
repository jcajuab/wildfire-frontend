"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ContentStatus } from "@/types/content";

export type StatusFilter = "all" | ContentStatus;

interface ContentStatusTabsProps {
  readonly value: StatusFilter;
  readonly onValueChange: (value: StatusFilter) => void;
}

const statusOptions: readonly {
  readonly value: StatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_USE", label: "In Use" },
] as const;

export function ContentStatusTabs({
  value,
  onValueChange,
}: ContentStatusTabsProps): React.ReactElement {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onValueChange(newValue as StatusFilter);
        }
      }}
      variant="outline"
      size="default"
    >
      {statusOptions.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={`Filter by ${option.label}`}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
