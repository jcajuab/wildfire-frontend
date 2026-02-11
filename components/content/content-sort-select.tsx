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
import type { ContentSortField } from "@/types/content";

interface ContentSortSelectProps {
  readonly value: ContentSortField;
  readonly onValueChange: (value: ContentSortField) => void;
}

const sortOptions: readonly {
  readonly value: ContentSortField;
  readonly label: string;
}[] = [
  { value: "recent", label: "Recent" },
  { value: "title", label: "Title" },
  { value: "size", label: "Size" },
  { value: "type", label: "Type" },
] as const;

export function ContentSortSelect({
  value,
  onValueChange,
}: ContentSortSelectProps): ReactElement {
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
