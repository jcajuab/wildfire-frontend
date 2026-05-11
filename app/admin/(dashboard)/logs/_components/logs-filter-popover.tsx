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
  ComboboxVirtualList,
} from "@/components/ui/combobox";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getResourceTypeLabel,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";
import type { RbacUser } from "@/lib/api/rbac-api";

import { type UseLogsPageResult } from "../_hooks/use-logs-page";

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
  const normalizedQuery = query.trim().toLowerCase().replace(/^@/, "");
  return value.toLowerCase().includes(normalizedQuery);
}

interface LogsFilterPopoverProps {
  readonly filters: UseLogsPageResult["filters"];
  readonly isFetching?: boolean;
  readonly selectedStatusValue: string | null;
  readonly authorOptions: readonly RbacUser[];
  readonly isAuthorOptionsFetching?: boolean;
  readonly isAuthorOptionsLoadingMore?: boolean;
  readonly hasMoreAuthorOptions?: boolean;
  readonly onFromChange: (nextValue: string) => void;
  readonly onToChange: (nextValue: string) => void;
  readonly onAuthorChange: (nextValue: string) => void;
  readonly onLoadMoreAuthorOptions?: () => void;
  readonly onResourceTypeChange: (nextValue: ResourceTypeFilter) => void;
  readonly onResourceTypeInputChange: (nextInputValue: string) => void;
  readonly onStatusChange: (nextValue: string) => void;
  readonly onResetFilters: () => void;
  readonly renderEmbeddedAnchor?: (trigger: ReactElement) => ReactElement;
}

export function LogsFilterPopover({
  filters,
  isFetching = false,
  selectedStatusValue,
  authorOptions,
  isAuthorOptionsFetching = false,
  isAuthorOptionsLoadingMore = false,
  hasMoreAuthorOptions = false,
  onFromChange,
  onToChange,
  onAuthorChange,
  onLoadMoreAuthorOptions,
  onResourceTypeChange,
  onResourceTypeInputChange,
  onStatusChange,
  onResetFilters,
  renderEmbeddedAnchor,
}: LogsFilterPopoverProps): ReactElement {
  const activeFilters = [
    filters.from,
    filters.to,
    filters.author,
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
  const authorItems = Array.from(
    new Set(authorOptions.map((user) => user.username)),
  ).sort((a, b) => a.localeCompare(b));
  const selectedAuthorValue = authorItems.includes(filters.author)
    ? filters.author
    : null;
  const filteredAuthorItems = authorItems.filter((username) =>
    includesNormalized(username, filters.author),
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
              <Label htmlFor="logs-filter-author">Author</Label>
              <Combobox
                value={selectedAuthorValue}
                items={authorItems}
                filteredItems={filteredAuthorItems}
                inputValue={filters.author}
                onValueChange={(nextValue) => onAuthorChange(nextValue ?? "")}
                onInputValueChange={(nextInputValue) =>
                  onAuthorChange(nextInputValue ?? "")
                }
              >
                <ComboboxInput
                  id="logs-filter-author"
                  placeholder="All authors"
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>No matching author.</ComboboxEmpty>
                  <ComboboxVirtualList
                    items={filteredAuthorItems}
                    hasMore={hasMoreAuthorOptions}
                    isLoadingMore={isAuthorOptionsLoadingMore}
                    onLoadMore={onLoadMoreAuthorOptions}
                    getItemKey={(username) => username}
                    renderItem={(username) => (
                      <ComboboxItem value={username}>@{username}</ComboboxItem>
                    )}
                  />
                  {isAuthorOptionsFetching && !isAuthorOptionsLoadingMore ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Loading authors...
                    </div>
                  ) : null}
                </ComboboxContent>
              </Combobox>
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
                  <ComboboxVirtualList
                    items={filteredStatusCodes}
                    getItemKey={(code) => code}
                    renderItem={(code) => (
                      <ComboboxItem value={code}>
                        {STATUS_CODE_LABELS[code]}
                      </ComboboxItem>
                    )}
                  />
                </ComboboxContent>
              </Combobox>
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
                  <ComboboxVirtualList
                    items={filteredResourceTypeItems}
                    getItemKey={(value) => value}
                    renderItem={(value) => (
                      <ComboboxItem value={value}>
                        {value === RESOURCE_TYPE_SELECT_ALL_VALUE
                          ? "All resource types"
                          : getResourceTypeLabel(value)}
                      </ComboboxItem>
                    )}
                  />
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
