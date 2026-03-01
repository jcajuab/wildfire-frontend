"use client";

import type { ReactElement } from "react";

import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { DisplaySearchInput } from "@/components/displays/display-search-input";
import { DisplaySortSelect } from "@/components/displays/display-sort-select";
import {
  DisplayStatusTabs,
  type DisplayStatusFilter,
} from "@/components/displays/display-status-tabs";
import type { DisplayOutputFilter, DisplaySortField } from "@/types/display";

interface DisplaysToolbarProps {
  readonly statusFilter: DisplayStatusFilter;
  readonly sortBy: DisplaySortField;
  readonly search: string;
  readonly selectedGroups: readonly string[];
  readonly selectedOutput: DisplayOutputFilter;
  readonly availableGroups: readonly string[];
  readonly availableOutputs: readonly string[];
  readonly onStatusFilterChange: (value: DisplayStatusFilter) => void;
  readonly onSortChange: (value: DisplaySortField) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onGroupFilterChange: (value: readonly string[]) => void;
  readonly onOutputFilterChange: (value: DisplayOutputFilter) => void;
  readonly onClearFilters: () => void;
}

export function DisplaysToolbar({
  statusFilter,
  sortBy,
  search,
  selectedGroups,
  selectedOutput,
  availableGroups,
  availableOutputs,
  onStatusFilterChange,
  onSortChange,
  onSearchChange,
  onGroupFilterChange,
  onOutputFilterChange,
  onClearFilters,
}: DisplaysToolbarProps): ReactElement {
  return (
    <>
      <DisplayStatusTabs
        value={statusFilter}
        onValueChange={onStatusFilterChange}
      />

      <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
        <DisplayFilterPopover
          selectedGroups={selectedGroups}
          selectedOutput={selectedOutput}
          availableGroups={availableGroups}
          availableOutputs={availableOutputs}
          onGroupsChange={onGroupFilterChange}
          onOutputChange={onOutputFilterChange}
          onClearFilters={onClearFilters}
        />
        <DisplaySortSelect value={sortBy} onValueChange={onSortChange} />
        <DisplaySearchInput
          value={search}
          onChange={onSearchChange}
          className="w-full max-w-none md:w-72"
        />
      </div>
    </>
  );
}
