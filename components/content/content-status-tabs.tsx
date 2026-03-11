"use client";

import type { ReactElement } from "react";
import { StatusFilterTabs } from "@/components/common/status-filter-tabs";
import type { ContentStatus } from "@/types/content";

export type StatusFilter = "all" | ContentStatus;

interface ContentStatusTabsProps {
  readonly value: StatusFilter;
  readonly onValueChange: (value: StatusFilter) => void;
}

const statusOptions: readonly {
  readonly value: StatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
] as const;

export function ContentStatusTabs({
  value,
  onValueChange,
}: ContentStatusTabsProps): ReactElement {
  return (
    <StatusFilterTabs
      value={value}
      onValueChange={onValueChange}
      options={statusOptions}
    />
  );
}
