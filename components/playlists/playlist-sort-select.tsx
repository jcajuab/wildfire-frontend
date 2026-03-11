"use client";

import type { ReactElement } from "react";
import { SortSelect } from "@/components/common/sort-select";
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
] as const;

export function PlaylistSortSelect({
  value,
  onValueChange,
}: PlaylistSortSelectProps): ReactElement {
  return (
    <SortSelect
      value={value}
      onValueChange={onValueChange}
      options={sortOptions}
      defaultLabel="Recent"
    />
  );
}
