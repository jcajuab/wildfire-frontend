"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";

import { DashboardPage } from "@/components/layout/dashboard-page";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/use-can";
import { useListAuditEventsQuery } from "@/lib/api/audit-api";
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import { useGetUsersQuery } from "@/lib/api/rbac-api";
import {
  getResourceTypeLabel,
  getResourceTypeValueFromInput,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogEntry } from "@/types/log";
import { useAuditLogFilters } from "./useAuditLogFilters";
import { useActorResolver } from "./useActorResolver";
import { AuditExportPopover } from "./AuditExportPopover";

const PAGE_SIZE = 20;
const ACTOR_TYPE_FILTERS = ["all", "user", "display"] as const;
type ActorTypeFilter = (typeof ACTOR_TYPE_FILTERS)[number];
const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const STATUS_CODE_LABELS: Record<(typeof COMMON_STATUS_CODES)[number], string> =
  {
    "200": "200 (OK)",
    "401": "401 (Unauthorized)",
    "403": "403 (Forbidden)",
    "404": "404 (Not Found)",
    "500": "500 (Internal Server Error)",
  };

export default function LogsPage(): ReactElement {
  const canExport = useCan("audit:read");
  const filters = useAuditLogFilters(PAGE_SIZE);

  const { data } = useListAuditEventsQuery(filters.listQuery);
  const canReadUsers = useCan("users:read");
  const canReadDisplays = useCan("displays:read");
  const { data: usersData } = useGetUsersQuery(
    { page: 1, pageSize: 100 },
    {
      skip: !canReadUsers,
    },
  );
  const { data: displaysData } = useGetDisplaysQuery(
    { page: 1, pageSize: 100 },
    {
      skip: !canReadDisplays,
    },
  );
  const users = usersData?.items ?? [];
  const displays = displaysData?.items ?? [];

  const actorResolver = useActorResolver({ users, displays });

  const logs = useMemo<LogEntry[]>(() => {
    return (data?.items ?? []).map((event) =>
      mapAuditEventToLogEntry(event, {
        getActorName: actorResolver.getActorName,
        getActorAvatarUrl: actorResolver.getActorAvatarUrl,
      }),
    );
  }, [data?.items, actorResolver]);

  const total = data?.total ?? 0;

  const resetToFirstPage = useCallback((): void => {
    if (filters.page !== 1) {
      filters.setPage(1);
    }
  }, [filters]);

  const handleFromChange = useCallback(
    (nextValue: string): void => {
      filters.setFrom(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleToChange = useCallback(
    (nextValue: string): void => {
      filters.setTo(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleActionChange = useCallback(
    (nextValue: string): void => {
      filters.setActionDraft(nextValue);
    },
    [filters],
  );

  const handleActorTypeChange = useCallback(
    (nextValue: ActorTypeFilter): void => {
      filters.setActorType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleResourceTypeChange = useCallback(
    (nextValue: ResourceTypeFilter): void => {
      filters.setResourceType(nextValue);
      filters.setResourceTypeInput(
        nextValue === "" ? "" : getResourceTypeLabel(nextValue),
      );
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleResourceTypeInputChange = useCallback(
    (nextInputValue: string): void => {
      const resolvedValue = getResourceTypeValueFromInput(nextInputValue);

      if (resolvedValue !== null && resolvedValue !== "") {
        filters.setResourceType(resolvedValue);
        filters.setResourceTypeInput(getResourceTypeLabel(resolvedValue));
        resetToFirstPage();
        return;
      }

      filters.setResourceTypeInput(nextInputValue);
      if (nextInputValue === "") {
        filters.setResourceType("");
        resetToFirstPage();
      }
    },
    [resetToFirstPage, filters],
  );

  const handleStatusChange = useCallback(
    (nextValue: string): void => {
      filters.setStatusRaw(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const selectedStatusValue = useMemo<string | null>(() => {
    return COMMON_STATUS_CODES.includes(
      filters.statusRaw as (typeof COMMON_STATUS_CODES)[number],
    )
      ? filters.statusRaw
      : null;
  }, [filters.statusRaw]);

  const handleRequestIdChange = useCallback(
    (nextValue: string): void => {
      filters.setRequestIdDraft(nextValue);
    },
    [filters],
  );

  const handleResetFilters = useCallback((): void => {
    filters.setFrom("");
    filters.setTo("");
    filters.setAction("");
    filters.setActionDraft("");
    filters.setActorType("all");
    filters.setResourceType("");
    filters.setResourceTypeInput("");
    filters.setStatusRaw("");
    filters.setRequestId("");
    filters.setRequestIdDraft("");
    filters.setPage(1);
  }, [filters]);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Logs"
        actions={
          canExport ? (
            <AuditExportPopover
              from={filters.from}
              to={filters.to}
              action={filters.action}
              actionDraft={filters.actionDraft}
              actorType={filters.actorType}
              resourceType={filters.resourceType}
              parsedStatus={filters.parsedStatus}
              requestId={filters.requestId}
              requestIdDraft={filters.requestIdDraft}
              total={total}
              onFromChange={handleFromChange}
              onToChange={handleToChange}
              onActionSync={() => filters.setAction(filters.actionDraft)}
              onRequestIdSync={() =>
                filters.setRequestId(filters.requestIdDraft)
              }
            />
          ) : null
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="logs-filter-from">From</Label>
                <Input
                  id="logs-filter-from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logs-filter-to">To</Label>
                <Input
                  id="logs-filter-to"
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleToChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logs-filter-action">Action</Label>
                <Input
                  id="logs-filter-action"
                  value={filters.actionDraft}
                  onChange={(e) => handleActionChange(e.target.value)}
                  placeholder="e.g. auth.session or rbac.user.update"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logs-filter-request-id">Request ID</Label>
                <Input
                  id="logs-filter-request-id"
                  value={filters.requestIdDraft}
                  onChange={(e) => handleRequestIdChange(e.target.value)}
                  placeholder="e.g. 2be5fd5a or full UUID"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Actor Type</Label>
                <Select
                  value={filters.actorType}
                  onValueChange={(value) => {
                    if (ACTOR_TYPE_FILTERS.includes(value as ActorTypeFilter)) {
                      handleActorTypeChange(value as ActorTypeFilter);
                    }
                  }}
                >
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue placeholder="All actor types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="display">Display</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
            <div className="overflow-hidden rounded-md border border-border">
              <LogsTable logs={logs} />
            </div>
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <LogsPagination
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={filters.setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
