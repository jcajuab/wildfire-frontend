"use client";

import type { ReactElement } from "react";

import { DashboardPage } from "@/components/layout/dashboard-page";
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
import { AuditExportPopover } from "./_components/audit-export-popover";
import {
  ACTOR_TYPE_FILTERS,
  PAGE_SIZE,
  useLogsPage,
  type ActorTypeFilter,
} from "./use-logs-page";

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
  const {
    canExport,
    filters,
    logs,
    total,
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

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Logs"
        actions={
          canExport ? (
            <AuditExportPopover
              action={filters.action}
              actionDraft={filters.actionDraft}
              actorType={filters.actorType}
              resourceType={filters.resourceType}
              parsedStatus={filters.parsedStatus}
              requestId={filters.requestId}
              requestIdDraft={filters.requestIdDraft}
              total={total}
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
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2.5 sm:px-8">
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="logs-filter-from">From</Label>
                <DateInput
                  id="logs-filter-from"
                  value={filters.from}
                  onChange={(e) => handleFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-to">To</Label>
                <DateInput
                  id="logs-filter-to"
                  value={filters.to}
                  onChange={(e) => handleToChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-action">Action</Label>
                <Input
                  id="logs-filter-action"
                  value={filters.actionDraft}
                  onChange={(e) => handleActionChange(e.target.value)}
                  placeholder="e.g. auth.session or rbac.user.update"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-filter-request-id">Request ID</Label>
                <Input
                  id="logs-filter-request-id"
                  value={filters.requestIdDraft}
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
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={filters.setPage}
            variant="numbered"
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
