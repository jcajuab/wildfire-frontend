"use client";

import type { ReactElement } from "react";
import { IconFilter, IconX } from "@tabler/icons-react";

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
} from "@/app/admin/(dashboard)/logs/_hooks/use-logs-page";

const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const STATUS_CODE_LABELS: Record<(typeof COMMON_STATUS_CODES)[number], string> =
  {
    "200": "200 (OK)",
    "401": "401 (Unauthorized)",
    "403": "403 (Forbidden)",
    "404": "404 (Not Found)",
    "500": "500 (Internal Server Error)",
  };

interface LogsFilterPopoverProps {
  readonly fromDraft: string;
  readonly toDraft: string;
  readonly action: string;
  readonly requestId: string;
  readonly actorType: ActorTypeFilter;
  readonly selectedResourceTypeValue: string | null;
  readonly resourceTypeInput: string;
  readonly statusRaw: string;
  readonly selectedStatusValue: string | null;
  readonly activeFilterCount: number;
  readonly isFetching?: boolean;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
  readonly onActionChange: (value: string) => void;
  readonly onRequestIdChange: (value: string) => void;
  readonly onActorTypeChange: (value: ActorTypeFilter) => void;
  readonly onResourceTypeChange: (value: ResourceTypeFilter | "") => void;
  readonly onResourceTypeInputChange: (value: string) => void;
  readonly onStatusChange: (value: string) => void;
  readonly onResetFilters: () => void;
}

export function LogsFilterPopover({
  fromDraft,
  toDraft,
  action,
  requestId,
  actorType,
  selectedResourceTypeValue,
  resourceTypeInput,
  statusRaw,
  selectedStatusValue,
  activeFilterCount,
  isFetching = false,
  onFromChange,
  onToChange,
  onActionChange,
  onRequestIdChange,
  onActorTypeChange,
  onResourceTypeChange,
  onResourceTypeInputChange,
  onStatusChange,
  onResetFilters,
}: LogsFilterPopoverProps): ReactElement {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <IconFilter className="size-4" aria-hidden="true" />
          <span>Filter</span>
          {isFetching ? (
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : hasActiveFilters ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-4"
        side="bottom"
        align="end"
        avoidCollisions={false}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onResetFilters}
              disabled={!hasActiveFilters}
            >
              <IconX className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="logs-filter-from"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                From
              </Label>
              <DateInput
                id="logs-filter-from"
                value={fromDraft}
                onChange={(e) => onFromChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="logs-filter-to"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                To
              </Label>
              <DateInput
                id="logs-filter-to"
                value={toDraft}
                onChange={(e) => onToChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="logs-filter-action"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Action
            </Label>
            <Input
              id="logs-filter-action"
              value={action}
              onChange={(e) => onActionChange(e.target.value)}
              placeholder="e.g. auth.session or rbac.user.update"
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="logs-filter-request-id"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Request ID
            </Label>
            <Input
              id="logs-filter-request-id"
              value={requestId}
              onChange={(e) => onRequestIdChange(e.target.value)}
              placeholder="e.g. 2be5fd5a or full UUID"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actor Type
            </Label>
            <Select
              value={actorType}
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
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="display">Display</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="logs-filter-resource-type"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Resource Type
            </Label>
            <Combobox
              value={selectedResourceTypeValue}
              inputValue={resourceTypeInput}
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
                placeholder="Choose or type to filter resource type"
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>No matching resource type.</ComboboxEmpty>
                <ComboboxList>
                  <ComboboxItem value={RESOURCE_TYPE_SELECT_ALL_VALUE}>
                    All
                  </ComboboxItem>
                  {RESOURCE_TYPE_FILTER_OPTIONS.filter(
                    (v): v is NonNullable<ResourceTypeFilter> => v !== "",
                  ).map((v) => (
                    <ComboboxItem key={v} value={v}>
                      {getResourceTypeLabel(v)}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="logs-filter-status"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Status
            </Label>
            <Combobox
              value={selectedStatusValue}
              inputValue={statusRaw}
              onValueChange={(nextValue) => onStatusChange(nextValue ?? "")}
              onInputValueChange={(nextInputValue) =>
                onStatusChange(nextInputValue)
              }
            >
              <ComboboxInput
                id="logs-filter-status"
                inputMode="numeric"
                placeholder="Type 100-599 or choose common code"
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>No matching status code.</ComboboxEmpty>
                <ComboboxList>
                  {COMMON_STATUS_CODES.map((code) => (
                    <ComboboxItem key={code} value={code}>
                      {STATUS_CODE_LABELS[code]}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
