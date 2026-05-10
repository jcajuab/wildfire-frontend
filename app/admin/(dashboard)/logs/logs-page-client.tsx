"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import { useState } from "react";

import { LogsTable } from "@/components/logs/logs-table";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import {
  auditApi,
  type AuditListQuery,
  type BackendAuditListResponse,
} from "@/lib/api/audit-api";
import { displaysApi, type DisplayOption } from "@/lib/api/displays-api";
import { rbacApi, type RbacUser } from "@/lib/api/rbac-api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

import { AuditExportDialog } from "./_components/audit-export-dialog";
import { FlushLogsDialog } from "./_components/flush-logs-dialog";
import { LogsFilterPopover } from "./_components/logs-filter-popover";
import { ManageLogsMenu } from "./_components/manage-logs-menu";
import { useLogsPage } from "./_hooks/use-logs-page";

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

export function UserOptionsCacheSeeder({
  data,
}: {
  readonly data: readonly RbacUser[];
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => rbacApi.endpoints.getUserOptions.select(undefined)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      rbacApi.util.upsertQueryData("getUserOptions", undefined, [...data]),
    );
  }, [dispatch, data, cachedData]);
  return null;
}

export function DisplayOptionsCacheSeeder({
  data,
}: {
  readonly data: readonly DisplayOption[];
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      displaysApi.endpoints.getDisplayOptions.select(undefined)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      displaysApi.util.upsertQueryData("getDisplayOptions", undefined, [
        ...data,
      ]),
    );
  }, [dispatch, data, cachedData]);
  return null;
}

export function LogsPageClient({
  initialEvents,
  initialUsers,
  initialDisplays,
}: {
  readonly initialEvents?: {
    readonly queryArgs: AuditListQuery;
    readonly data: BackendAuditListResponse;
  };
  readonly initialUsers?: readonly RbacUser[];
  readonly initialDisplays?: readonly DisplayOption[];
} = {}): ReactElement {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [flushDialogOpen, setFlushDialogOpen] = useState(false);
  const {
    canExport,
    canFlush,
    filters,
    logs,
    total,
    isFetching,
    handleSearchChange,
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
  } = useLogsPage({ initialEvents, initialUsers, initialDisplays });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <header className="shrink-0 border-b border-border bg-background p-4">
        <div className="grid min-w-0 grid-cols-1 items-center gap-3 md:grid-cols-[auto_minmax(12rem,1fr)_auto]">
          <h1 className="min-w-0 truncate text-xl font-semibold tracking-normal text-foreground">
            Logs
          </h1>
          <div className="flex min-w-0 justify-center">
            <div className="w-full min-w-0 md:max-w-[44rem]">
              <LogsFilterPopover
                filters={filters}
                isFetching={isFetching}
                selectedStatusValue={selectedStatusValue}
                onFromChange={handleFromChange}
                onToChange={handleToChange}
                onActionChange={handleActionChange}
                onActorTypeChange={handleActorTypeChange}
                onResourceTypeChange={handleResourceTypeChange}
                onResourceTypeInputChange={handleResourceTypeInputChange}
                onStatusChange={handleStatusChange}
                onRequestIdChange={handleRequestIdChange}
                onResetFilters={handleResetFilters}
                renderEmbeddedAnchor={(trigger) => (
                  <SearchControl
                    value={filters.search}
                    onChange={handleSearchChange}
                    ariaLabel="Search logs"
                    placeholder="Search by action, actor, route, or request ID"
                    className="max-w-none"
                    trailingAction={trigger}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex min-w-0 justify-start md:justify-end">
            <ManageLogsMenu
              canExport={canExport}
              canFlush={canFlush}
              onExport={() => setExportDialogOpen(true)}
              onFlush={() => setFlushDialogOpen(true)}
            />
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden p-4">
            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
              {isFetching ? (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-16"
                  aria-busy
                  aria-live="polite"
                >
                  <span className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Updating Logs...
                  </span>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <LogsTable
                  logs={logs}
                  emptyDescription="No audit log entries match the current filters. Try adjusting or resetting your filters."
                />
              </div>
              <footer className="border-t border-border bg-background/80">
                <PaginationFooter
                  page={filters.page}
                  pageSize={LOGS_PAGE_SIZE}
                  total={total}
                  onPageChange={filters.setPage}
                  alwaysShow
                />
              </footer>
            </section>
          </div>
        </div>
      </section>
      <AuditExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        q={filters.search}
        action={filters.action}
        actorType={filters.actorType}
        resourceType={filters.resourceType}
        parsedStatus={filters.parsedStatus}
        requestId={filters.requestId}
        total={total}
      />
      <FlushLogsDialog
        open={flushDialogOpen}
        onOpenChange={setFlushDialogOpen}
        onFlushed={() => filters.setPage(1)}
      />
    </div>
  );
}
