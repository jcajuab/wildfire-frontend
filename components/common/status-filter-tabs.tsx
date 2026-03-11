"use client";

import type { ReactElement } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface StatusOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface StatusFilterTabsProps<T extends string> {
  readonly value: T;
  readonly onValueChange: (value: T) => void;
  readonly options: readonly StatusOption<T>[];
  readonly className?: string;
}

export function StatusFilterTabs<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: StatusFilterTabsProps<T>): ReactElement {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onValueChange(newValue as T);
        }
      }}
      variant="outline"
      size="default"
      className={cn(className)}
    >
      {options.map((option) => (
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
