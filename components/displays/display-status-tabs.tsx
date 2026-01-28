"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DisplayStatus } from "@/types/display";

export type DisplayStatusFilter = "all" | DisplayStatus;

interface DisplayStatusTabsProps {
  readonly value: DisplayStatusFilter;
  readonly onValueChange: (value: DisplayStatusFilter) => void;
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

export function DisplayStatusTabs({
  value,
  onValueChange,
}: DisplayStatusTabsProps): React.ReactElement {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onValueChange(newValue as DisplayStatusFilter);
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
