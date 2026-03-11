"use client";

import type { ReactElement } from "react";
import { StatusFilterTabs } from "@/components/common/status-filter-tabs";
import type { PlaylistStatus } from "@/types/playlist";

export type StatusFilter = "all" | PlaylistStatus;

interface PlaylistStatusTabsProps {
  readonly value: StatusFilter;
  readonly onValueChange: (value: StatusFilter) => void;
}

const statusOptions: readonly {
  readonly value: StatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_USE", label: "In Use" },
] as const;

export function PlaylistStatusTabs({
  value,
  onValueChange,
}: PlaylistStatusTabsProps): ReactElement {
  return (
    <StatusFilterTabs
      value={value}
      onValueChange={onValueChange}
      options={statusOptions}
    />
  );
}
