"use client";

import type { ReactElement } from "react";
import { SortSelect } from "@/components/common/sort-select";
import type { ContentSortField } from "@/types/content";

interface ContentSortSelectProps {
  readonly value: ContentSortField;
  readonly onValueChange: (value: ContentSortField) => void;
}

const sortOptions: readonly {
  readonly value: ContentSortField;
  readonly label: string;
}[] = [
  { value: "createdAt", label: "Recent" },
  { value: "title", label: "Title" },
  { value: "fileSize", label: "Size" },
  { value: "type", label: "Type" },
] as const;

export function ContentSortSelect({
  value,
  onValueChange,
}: ContentSortSelectProps): ReactElement {
  return (
    <SortSelect
      value={value}
      onValueChange={onValueChange}
      options={sortOptions}
      defaultLabel="Recent"
    />
  );
}
