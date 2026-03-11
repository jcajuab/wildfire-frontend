"use client";

import type { ReactElement } from "react";
import { SortSelect } from "@/components/common/sort-select";
import type { DisplaySortField } from "@/types/display";

interface DisplaySortSelectProps {
  readonly value: DisplaySortField;
  readonly onValueChange: (value: DisplaySortField) => void;
  readonly className?: string;
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
  className,
}: DisplaySortSelectProps): ReactElement {
  return (
    <SortSelect
      value={value}
      onValueChange={onValueChange}
      options={sortOptions}
      defaultLabel="Alphabetical"
      className={className}
    />
  );
}
