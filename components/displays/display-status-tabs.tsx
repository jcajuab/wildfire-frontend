"use client";

import type { ReactElement } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/types/display";

export type DisplayStatusFilter = "all" | DisplayStatus;

interface DisplayStatusTabsProps {
  readonly value: DisplayStatusFilter;
  readonly onValueChange: (value: DisplayStatusFilter) => void;
  readonly className?: string;
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
  className,
}: DisplayStatusTabsProps): ReactElement {
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
      className={cn("w-full justify-start sm:w-auto", className)}
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
