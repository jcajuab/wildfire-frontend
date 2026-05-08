"use client";

import type { ReactElement } from "react";
import { IconArrowsSort } from "@tabler/icons-react";
import { TableHeaderControl } from "@/components/common/table-header-control";
import { cn } from "@/lib/utils";

interface SortableHeaderProps<T extends string> {
  readonly field: T;
  readonly label: string;
  readonly align?: "start" | "center";
  readonly currentSort: {
    readonly field: T;
    readonly direction: "asc" | "desc";
  };
  readonly onSort: (field: T, direction: "asc" | "desc") => void;
}

export function SortableHeader<T extends string>({
  field,
  label,
  align = "start",
  currentSort,
  onSort,
}: SortableHeaderProps<T>): ReactElement {
  const isActive = currentSort.field === field;
  const isAsc = currentSort.direction === "asc";
  const nextDirection = isActive && isAsc ? "desc" : "asc";
  const nextDirectionLabel =
    nextDirection === "asc" ? "ascending" : "descending";

  const handleClick = (): void => {
    onSort(field, nextDirection);
  };

  return (
    <TableHeaderControl
      className={cn(align === "center" ? "mx-auto" : "-ml-1")}
      onClick={handleClick}
      title={`Sort by ${label} ${nextDirectionLabel}`}
    >
      <span>{label}</span>
      <IconArrowsSort
        className={cn(
          "size-3.5",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className="sr-only"> sort {nextDirectionLabel}</span>
    </TableHeaderControl>
  );
}
