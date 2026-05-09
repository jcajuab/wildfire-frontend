"use client";

import type { ReactElement } from "react";
import { IconFilter, IconLoader2, IconX } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getResourceTypeLabel,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";

import {
  ACTOR_TYPE_FILTERS,
  type ActorTypeFilter,
  type UseLogsPageResult,
} from "../_hooks/use-logs-page";

const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const STATUS_CODE_LABELS: Record<(typeof COMMON_STATUS_CODES)[number], string> =
  {
    "200": "200 (OK)",
    "401": "401 (Unauthorized)",
    "403": "403 (Forbidden)",
    "404": "404 (Not Found)",
    "500": "500 (Internal Server Error)",
  };
const RESOURCE_TYPE_FILTER_VALUES = RESOURCE_TYPE_FILTER_OPTIONS.filter(
  (value): value is NonNullable<ResourceTypeFilter> => value !== "",
);

function includesNormalized(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

interface LogsFilterPopoverProps {
  readonly filters: UseLogsPageResult["filters"];
  readonly isFetching?: boolean;
  readonly selectedStatusValue: string | null;
  readonly onFromChange: (nextValue: string) => void;
  readonly onToChange: (nextValue: string) => void;
  readonly onActionChange: (nextValue: string) => void;
  readonly onActorTypeChange: (nextValue: ActorTypeFilter) => void;
  readonly onResourceTypeChange: (nextValue: ResourceTypeFilter) => void;
  readonly onResourceTypeInputChange: (nextInputValue: string) => void;
  readonly onStatusChange: (nextValue: string) => void;
  readonly onRequestIdChange: (nextValue: string) => void;
  readonly onResetFilters: () => void;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
}

export function LogsFilterPopover({
  filters,
  isFetching = false,
  selectedStatusValue,
  onFromChange,
  onToChange,
  onActionChange,
  onActorTypeChange,
  onResourceTypeChange,
  onResourceTypeInputChange,
  onStatusChange,
  onRequestIdChange,
  onResetFilters,
  renderEmbeddedAnchor,
}: LogsFilterPopoverProps): ReactElement {
  const activeFilters = [
    filters.from,
    filters.to,
    filters.action,
    filters.requestId,
    filters.actorType !== "all" ? filters.actorType : "",
    filters.resourceType,
    filters.parsedStatus != null ? String(filters.parsedStatus) : "",
  ].filter(Boolean);
  const activeFilterCount = activeFilters.length;

  const resourceTypeItems = [
    RESOURCE_TYPE_SELECT_ALL_VALUE,
    ...RESOURCE_TYPE_FILTER_VALUES,
  ];
  const filteredResourceTypeItems = resourceTypeItems.filter((value) => {
    const label =
      value === RESOURCE_TYPE_SELECT_ALL_VALUE
        ? "All resource types"
        : getResourceTypeLabel(value);
    return includesNormalized(label, filters.resourceTypeInput);
  });
  const filteredStatusCodes = COMMON_STATUS_CODES.filter((code) =>
    includesNormalized(STATUS_CODE_LABELS[code], filters.statusRaw),
  );

  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Filter logs"
        className="relative"
      >
        {isFetching ? (
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <IconFilter className="size-4" aria-hidden="true" />
        )}
        {activeFilterCount > 0 ? (
          <Badge
            variant="secondary"
            className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {activeFilterCount}
          </Badge>
        ) : null}
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover>
      {renderEmbeddedAnchor ? renderEmbeddedAnchor(trigger) : trigger}
      <PopoverContent
        align="center"
        sideOffset={4}
        className="w-[30rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="grid gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="logs-filter-from">From</Label>
              <DateInput
                id="logs-filter-from"
                value={filters.fromDraft}
                onChange={(event) => onFromChange(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logs-filter-to">To</Label>
              <DateInput
                id="logs-filter-to"
                value={filters.toDraft}
                onChange={(event) => onToChange(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Actor Type</Label>
              <Select
                value={filters.actorType}
                onValueChange={(value) => {
                  if (ACTOR_TYPE_FILTERS.includes(value as ActorTypeFilter)) {
                    onActorTypeChange(value as ActorTypeFilter);
                  }
                }}
              >
                <SelectTrigger
                  aria-label="Actor Type"
                  className="w-full justify-between"
                >
                  <SelectValue placeholder="All actor types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actor types</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="display">Displays</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logs-filter-status">Status</Label>
              <Combobox
                value={selectedStatusValue}
                items={[...COMMON_STATUS_CODES]}
                filteredItems={filteredStatusCodes}
                inputValue={filters.statusRaw}
                onValueChange={(nextValue) => onStatusChange(nextValue ?? "")}
                onInputValueChange={(nextInputValue) =>
                  onStatusChange(nextInputValue)
                }
              >
                <ComboboxInput
                  id="logs-filter-status"
                  inputMode="numeric"
                  placeholder="All status codes"
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>No matching status code.</ComboboxEmpty>
                  <ComboboxList>
                    {filteredStatusCodes.map((code) => (
                      <ComboboxItem key={code} value={code}>
                        {STATUS_CODE_LABELS[code]}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logs-filter-action">Action</Label>
              <Input
                id="logs-filter-action"
                value={filters.action}
                onChange={(event) => onActionChange(event.target.value)}
                placeholder="Filter by action"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logs-filter-request-id">Request ID</Label>
              <Input
                id="logs-filter-request-id"
                value={filters.requestId}
                onChange={(event) => onRequestIdChange(event.target.value)}
                placeholder="Filter by request ID"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="logs-filter-resource-type">Resource Type</Label>
              <Combobox
                value={filters.selectedResourceTypeValue}
                items={resourceTypeItems}
                filteredItems={filteredResourceTypeItems}
                inputValue={filters.resourceTypeInput}
                onValueChange={(nextValue) => {
                  if (nextValue === RESOURCE_TYPE_SELECT_ALL_VALUE) {
                    onResourceTypeChange("");
                  } else if (
                    nextValue != null &&
                    RESOURCE_TYPE_FILTER_OPTIONS.includes(
                      nextValue as ResourceTypeFilter,
                    )
                  ) {
                    onResourceTypeChange(nextValue as ResourceTypeFilter);
                  }
                }}
                onInputValueChange={(nextInputValue) =>
                  onResourceTypeInputChange(nextInputValue ?? "")
                }
              >
                <ComboboxInput
                  id="logs-filter-resource-type"
                  placeholder="All resource types"
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>No matching resource type.</ComboboxEmpty>
                  <ComboboxList>
                    {filteredResourceTypeItems.map((value) => (
                      <ComboboxItem key={value} value={value}>
                        {value === RESOURCE_TYPE_SELECT_ALL_VALUE
                          ? "All resource types"
                          : getResourceTypeLabel(value)}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-muted-foreground">
                {activeFilterCount} active{" "}
                {activeFilterCount === 1 ? "filter" : "filters"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
              >
                <IconX className="size-4" aria-hidden="true" />
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
