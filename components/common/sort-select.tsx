"use client";

import type { ReactElement } from "react";
import { IconSortDescending } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SortOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SortSelectProps<T extends string> {
  readonly value: T;
  readonly onValueChange: (value: T) => void;
  readonly options: readonly SortOption<T>[];
  readonly defaultLabel?: string;
  readonly className?: string;
}

export function SortSelect<T extends string>({
  value,
  onValueChange,
  options,
  defaultLabel = "Sort",
  className,
}: SortSelectProps<T>): ReactElement {
  const currentLabel =
    options.find((option) => option.value === value)?.label ?? defaultLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className={cn(className)}>
          <IconSortDescending className="size-4" aria-hidden="true" />
          <span>Sort: {currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
