"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LogsTable } from "@/components/logs/logs-table";
import { PaginationFooter } from "@/components/common/pagination-footer";
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
  auditApi,
  type AuditListQuery,
  type BackendAuditListResponse,
} from "@/lib/api/audit-api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

import { AuditExportPopover } from "./_components/audit-export-popover";
import {
  ACTOR_TYPE_FILTERS,
  useLogsPage,
  type ActorTypeFilter,
} from "./_hooks/use-logs-page";

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

export function AuditListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: AuditListQuery;
  readonly data: BackendAuditListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => auditApi.endpoints.listAuditEvents.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(auditApi.util.upsertQueryData("listAuditEvents", queryArgs, data));
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function LogsPageClient(): ReactElement {
  const {
    canExport,
    filters,
    logs,
    total,
    isFetching,
    handleFromChange,
    handleToChange,
    handleActionChange,
    handleActorTypeChange,
    handleResourceTypeChange,
    handleResourceTypeInputChange,
    handleStatusChange,
    handleRequestIdChange,
    handleResetFilters,
    selectedStatusValue,
  } = useLogsPage();
  const resourceTypeItems = [
    RESOURCE_TYPE_SELECT_ALL_VALUE,
    ...RESOURCE_TYPE_FILTER_VALUES,
  ];
  const filteredResourceTypeItems = resourceTypeItems.filter((value) => {
    const label =
      value === RESOURCE_TYPE_SELECT_ALL_VALUE
        ? "All"
        : getResourceTypeLabel(value);
    return includesNormalized(label, filters.resourceTypeInput);
  });
  const filteredStatusCodes = COMMON_STATUS_CODES.filter((code) =>
    includesNormalized(STATUS_CODE_LABELS[code], filters.statusRaw),
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Logs">
        {canExport ? (
          <AuditExportPopover
            action={filters.action}
            actorType={filters.actorType}
            resourceType={filters.resourceType}
            parsedStatus={filters.parsedStatus}
            requestId={filters.requestId}
            total={total}
          />
        ) : null}
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 p-4">
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="logs-filter-from">From</Label>
                <DateInput
                  id="logs-filter-from"
                  value={filters.fromDraft}
                  onChange={(e) => handleFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-to">To</Label>
                <DateInput
                  id="logs-filter-to"
                  value={filters.toDraft}
                  onChange={(e) => handleToChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-action">Action</Label>
                <Input
                  id="logs-filter-action"
                  value={filters.action}
                  onChange={(e) => handleActionChange(e.target.value)}
                  placeholder="e.g. auth.session or rbac.user.update"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-request-id">Request ID</Label>
                <Input
                  id="logs-filter-request-id"
                  value={filters.requestId}
                  onChange={(e) => handleRequestIdChange(e.target.value)}
                  placeholder="e.g. 2be5fd5a or full UUID"
                />
              </div>
              <div className="space-y-1">
                <Label>Actor Type</Label>
                <Select
                  value={filters.actorType}
                  onValueChange={(value) => {
                    if (ACTOR_TYPE_FILTERS.includes(value as ActorTypeFilter)) {
                      handleActorTypeChange(value as ActorTypeFilter);
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
                <Label htmlFor="logs-filter-resource-type">Resource Type</Label>
                <Combobox
                  value={filters.selectedResourceTypeValue}
                  items={resourceTypeItems}
                  filteredItems={filteredResourceTypeItems}
                  inputValue={filters.resourceTypeInput}
                  onValueChange={(nextValue) => {
                    if (nextValue === RESOURCE_TYPE_SELECT_ALL_VALUE) {
                      handleResourceTypeChange("");
                    } else if (
                      nextValue != null &&
                      RESOURCE_TYPE_FILTER_OPTIONS.includes(
                        nextValue as ResourceTypeFilter,
                      )
                    ) {
                      handleResourceTypeChange(nextValue as ResourceTypeFilter);
                    }
                  }}
                  onInputValueChange={(nextInputValue) =>
                    handleResourceTypeInputChange(nextInputValue ?? "")
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
                      {filteredResourceTypeItems.map((value) => (
                        <ComboboxItem key={value} value={value}>
                          {value === RESOURCE_TYPE_SELECT_ALL_VALUE
                            ? "All"
                            : getResourceTypeLabel(value)}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-status">Status</Label>
                <Combobox
                  value={selectedStatusValue}
                  items={[...COMMON_STATUS_CODES]}
                  filteredItems={filteredStatusCodes}
                  inputValue={filters.statusRaw}
                  onValueChange={(nextValue) =>
                    handleStatusChange(nextValue ?? "")
                  }
                  onInputValueChange={(nextInputValue) =>
                    handleStatusChange(nextInputValue)
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
                      {filteredStatusCodes.map((code) => (
                        <ComboboxItem key={code} value={code}>
                          {STATUS_CODE_LABELS[code]}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-reset-filters">Reset Filters</Label>
                <Button
                  id="logs-reset-filters"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto p-4">
            {isFetching && logs.length > 0 ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-16"
                aria-busy
                aria-live="polite"
              >
                <span className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Updating logs…
                </span>
              </div>
            ) : null}
            {logs.length === 0 ? (
              <EmptyState
                title="No logs found"
                description="No audit log entries match the current filters. Try adjusting or resetting your filters."
              />
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <LogsTable logs={logs} />
              </div>
            )}
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          <PaginationFooter
            page={filters.page}
            pageSize={LOGS_PAGE_SIZE}
            total={total}
            onPageChange={filters.setPage}
            variant="numbered"
          />
        </footer>
      </section>
    </div>
  );
}
