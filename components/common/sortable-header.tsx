"use client";

import type { ReactElement } from "react";
import {
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";

interface SortableHeaderProps<T extends string> {
  readonly field: T;
  readonly label: string;
  readonly currentSort: {
    readonly field: T;
    readonly direction: "asc" | "desc";
  };
  readonly onSort: (field: T, direction: "asc" | "desc") => void;
}

export function SortableHeader<T extends string>({
  field,
  label,
  currentSort,
  onSort,
}: SortableHeaderProps<T>): ReactElement {
  const isActive = currentSort.field === field;
  const isAsc = currentSort.direction === "asc";

  const handleClick = (): void => {
    if (isActive) {
      onSort(field, isAsc ? "desc" : "asc");
    } else {
      onSort(field, "asc");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm px-0.5 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2"
    >
      {label}
      {isActive ? (
        isAsc ? (
          <IconSortAscending className="size-4" />
        ) : (
          <IconSortDescending className="size-4" />
        )
      ) : (
        <IconArrowsSort className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}
