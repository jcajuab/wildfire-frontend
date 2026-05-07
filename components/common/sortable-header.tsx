"use client";

import type { ReactElement } from "react";
import { IconArrowsSort } from "@tabler/icons-react";
import { TableHeaderControl } from "@/components/common/table-header-control";
import { cn } from "@/lib/utils";

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
    <TableHeaderControl onClick={handleClick}>
      {label}
      <IconArrowsSort
        className={cn(
          "size-3.5",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
    </TableHeaderControl>
  );
}
