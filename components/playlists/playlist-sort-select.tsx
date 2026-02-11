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
import type { PlaylistSortField } from "@/types/playlist";

interface PlaylistSortSelectProps {
  readonly value: PlaylistSortField;
  readonly onValueChange: (value: PlaylistSortField) => void;
}

const sortOptions: readonly {
  readonly value: PlaylistSortField;
  readonly label: string;
}[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name" },
  { value: "duration", label: "Duration" },
  { value: "items", label: "Items" },
] as const;

export function PlaylistSortSelect({
  value,
  onValueChange,
}: PlaylistSortSelectProps): ReactElement {
  const currentLabel =
    sortOptions.find((option) => option.value === value)?.label ?? "Recent";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default">
          <IconSortDescending className="size-4" />
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
