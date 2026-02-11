"use client";

import type { ReactElement } from "react";
import { IconSortAscendingLetters } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DisplaySortField } from "@/types/display";

interface DisplaySortSelectProps {
  readonly value: DisplaySortField;
  readonly onValueChange: (value: DisplaySortField) => void;
}

const sortOptions: readonly {
  readonly value: DisplaySortField;
  readonly label: string;
}[] = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "status", label: "Status" },
  { value: "location", label: "Location" },
] as const;

export function DisplaySortSelect({
  value,
  onValueChange,
}: DisplaySortSelectProps): ReactElement {
  const currentLabel =
    sortOptions.find((option) => option.value === value)?.label ??
    "Alphabetical";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default">
          <IconSortAscendingLetters className="size-4" />
          <span>Sort: {currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortOptions.map((option) => (
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
