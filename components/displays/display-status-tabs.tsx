"use client";

import type { ReactElement } from "react";
import { StatusFilterTabs } from "@/components/common/status-filter-tabs";
import type { DisplayStatus } from "@/types/display";

export type DisplayStatusFilter = "all" | DisplayStatus;

interface DisplayStatusTabsProps {
  readonly value: DisplayStatusFilter;
  readonly onValueChange: (value: DisplayStatusFilter) => void;
  readonly className?: string;
}

const statusOptions: readonly {
  readonly value: DisplayStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "LIVE", label: "Live" },
  { value: "DOWN", label: "Down" },
] as const;

export function DisplayStatusTabs({
  value,
  onValueChange,
  className,
}: DisplayStatusTabsProps): ReactElement {
  return (
    <StatusFilterTabs
      value={value}
      onValueChange={onValueChange}
      options={statusOptions}
      className={className}
    />
  );
}
