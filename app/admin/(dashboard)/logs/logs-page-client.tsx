"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";

import type { BackendAuditEvent } from "@/lib/api/audit-api";
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
  getResourceTypeFilterLabel,
  getResourceTypeLabel,
  getResourceTypeValueFromInput,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";
import type { RbacUser } from "@/lib/api/rbac-api";
import type { DisplayOption } from "@/lib/api/displays-api";

import { AuditExportPopover } from "./_components/audit-export-popover";
import {
  ACTOR_TYPE_FILTERS,
  useAuditLogFilters,
  type ActorTypeFilter,
} from "./_hooks/use-audit-log-filters";
import { useActorResolver } from "./_hooks/use-actor-resolver";
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const STATUS_CODE_LABELS: Record<(typeof COMMON_STATUS_CODES)[number], string> =
  {
    "200": "200 (OK)",
    "401": "401 (Unauthorized)",
    "403": "403 (Forbidden)",
    "404": "404 (Not Found)",
    "500": "500 (Internal Server Error)",
  };

export interface LogsPageClientProps {
  readonly canExport: boolean;
  readonly events: readonly BackendAuditEvent[];
  readonly total: number;
  readonly users: readonly RbacUser[];
  readonly displays: readonly DisplayOption[];
}

export function LogsPageClient({
  canExport,
  events,
  total,
  users,
  displays,
}: LogsPageClientProps): ReactElement {
  const filters = useAuditLogFilters(LOGS_PAGE_SIZE);

  const actorResolver = useActorResolver({ users, displays });

  const logs = useMemo<LogEntry[]>(() => {
    return events.map((event) =>
      mapAuditEventToLogEntry(event, {
        getActorName: actorResolver.getActorName,
        getActorAvatarUrl: actorResolver.getActorAvatarUrl,
      }),
    );
  }, [events, actorResolver]);

  const {
    page,
    setPage,
    setFromDraft,
    setToDraft,
    setAction,
    setActorType,
    setResourceType,
    setResourceTypeInput,
    setStatusRaw,
    setRequestId,
    resetAll,
    statusRaw,
  } = filters;

  const resetToFirstPage = useCallback((): void => {
    if (page !== 1) {
      setPage(1);
    }
  }, [page, setPage]);

  const handleFromChange = useCallback(
    (nextValue: string): void => {
      setFromDraft(nextValue);
    },
    [setFromDraft],
  );

  const handleToChange = useCallback(
    (nextValue: string): void => {
      setToDraft(nextValue);
    },
    [setToDraft],
  );

  const handleActionChange = useCallback(
    (nextValue: string): void => {
      setAction(nextValue);
    },
    [setAction],
  );

  const handleActorTypeChange = useCallback(
    (nextValue: ActorTypeFilter): void => {
      setActorType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setActorType],
  );

  const handleResourceTypeChange = useCallback(
    (nextValue: ResourceTypeFilter): void => {
      setResourceType(nextValue);
      setResourceTypeInput(getResourceTypeFilterLabel(nextValue));
      resetToFirstPage();
    },
    [resetToFirstPage, setResourceType, setResourceTypeInput],
  );

  const handleResourceTypeInputChange = useCallback(
    (nextInputValue: string): void => {
      const resolvedValue = getResourceTypeValueFromInput(nextInputValue);

      if (resolvedValue !== null) {
        setResourceType(resolvedValue);
        setResourceTypeInput(getResourceTypeFilterLabel(resolvedValue));
        resetToFirstPage();
        return;
      }

      setResourceTypeInput(nextInputValue);
      if (nextInputValue === "") {
        setResourceType("");
        resetToFirstPage();
      }
    },
    [resetToFirstPage, setResourceType, setResourceTypeInput],
  );

  const handleStatusChange = useCallback(
    (nextValue: string): void => {
      setStatusRaw(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setStatusRaw],
  );

  const selectedStatusValue = useMemo<string | null>(() => {
    return COMMON_STATUS_CODES.includes(
      statusRaw as (typeof COMMON_STATUS_CODES)[number],
    )
      ? statusRaw
      : null;
  }, [statusRaw]);

  const handleRequestIdChange = useCallback(
    (nextValue: string): void => {
      setRequestId(nextValue);
    },
    [setRequestId],
  );

  const handleResetFilters = useCallback((): void => {
    resetAll();
  }, [resetAll]);

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
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2.5 sm:px-8">
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
                <Label htmlFor="logs-filter-status">Status</Label>
                <Combobox
                  value={selectedStatusValue}
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
                      {COMMON_STATUS_CODES.map((code) => (
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
          <div className="relative min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
