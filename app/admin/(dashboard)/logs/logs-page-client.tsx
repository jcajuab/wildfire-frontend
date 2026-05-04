"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { LogsFilterPopover } from "@/components/logs/logs-filter-popover";
import { LogsTable } from "@/components/logs/logs-table";
import { PaginationFooter } from "@/components/common/pagination-footer";
import {
  auditApi,
  type AuditListQuery,
  type BackendAuditListResponse,
} from "@/lib/api/audit-api";
import { useAppDispatch } from "@/lib/hooks";
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

import { AuditExportPopover } from "./_components/audit-export-popover";
import { useLogsPage } from "./_hooks/use-logs-page";

export function AuditListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: AuditListQuery;
  readonly data: BackendAuditListResponse;
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(auditApi.util.upsertQueryData("listAuditEvents", queryArgs, data));
  }, [dispatch, queryArgs, data]);
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
          <PageToolbar
            end={
              <LogsFilterPopover
                fromDraft={filters.fromDraft}
                toDraft={filters.toDraft}
                action={filters.action}
                requestId={filters.requestId}
                actorType={filters.actorType}
                selectedResourceTypeValue={filters.selectedResourceTypeValue}
                resourceTypeInput={filters.resourceTypeInput}
                statusRaw={filters.statusRaw}
                selectedStatusValue={selectedStatusValue}
                activeFilterCount={
                  (filters.fromDraft ? 1 : 0) +
                  (filters.toDraft ? 1 : 0) +
                  (filters.action ? 1 : 0) +
                  (filters.requestId ? 1 : 0) +
                  (filters.actorType !== "all" ? 1 : 0) +
                  (filters.resourceType ? 1 : 0) +
                  (filters.statusRaw ? 1 : 0)
                }
                isFetching={isFetching && logs.length === 0}
                onFromChange={handleFromChange}
                onToChange={handleToChange}
                onActionChange={handleActionChange}
                onRequestIdChange={handleRequestIdChange}
                onActorTypeChange={handleActorTypeChange}
                onResourceTypeChange={handleResourceTypeChange}
                onResourceTypeInputChange={handleResourceTypeInputChange}
                onStatusChange={handleStatusChange}
                onResetFilters={handleResetFilters}
              />
            }
          />
          <div className="relative min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
