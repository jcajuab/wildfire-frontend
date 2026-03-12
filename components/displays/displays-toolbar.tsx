"use client";

import type { ReactElement } from "react";

import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { SearchControl } from "@/components/common/search-control";
import type { DisplayOutputFilter } from "@/types/display";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";

interface DisplaysToolbarProps {
  readonly statusFilter: DisplayStatusFilter;
  readonly search: string;
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly filteredResultsCount: number;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly onStatusFilterChange: (value: DisplayStatusFilter) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onGroupFilterChange: (value: readonly string[]) => void;
  readonly onOutputFilterChange: (value: DisplayOutputFilter) => void;
  readonly onClearFilters: () => void;
}

export function DisplaysToolbar({
  statusFilter,
  search,
  selectedGroups,
  selectedOutput,
  filteredResultsCount,
  availableGroups,
  availableOutputs,
  onStatusFilterChange,
  onSearchChange,
  onGroupFilterChange,
  onOutputFilterChange,
  onClearFilters,
}: DisplaysToolbarProps): ReactElement {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <DisplayFilterPopover
        statusFilter={statusFilter}
        selectedGroups={selectedGroups}
        selectedOutput={selectedOutput}
        filteredResultsCount={filteredResultsCount}
        availableGroups={availableGroups}
        availableOutputs={availableOutputs}
        onStatusChange={onStatusFilterChange}
        onGroupsChange={onGroupFilterChange}
        onOutputChange={onOutputFilterChange}
        onClearFilters={onClearFilters}
      />
      <SearchControl
        value={search}
        onChange={onSearchChange}
        ariaLabel="Search displays"
        className="w-full max-w-none sm:w-72"
      />
    </div>
  );
}
