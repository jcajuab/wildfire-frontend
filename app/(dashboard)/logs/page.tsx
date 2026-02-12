"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { DashboardPage } from "@/components/layout";
import { LogSearchInput } from "@/components/logs/log-search-input";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import {
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useCan } from "@/hooks/use-can";
import {
  exportAuditEventsCsv,
  useListAuditEventsQuery,
} from "@/lib/api/audit-api";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";

export default function LogsPage(): ReactElement {
  const canExport = useCan("audit:export");
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);
  const { data } = useListAuditEventsQuery({ page: 1, pageSize: 200 });
  const allLogs = useMemo<LogEntry[]>(
    () => (data?.items ?? []).map(mapAuditEventToLogEntry),
    [data?.items],
  );

  const pageSize = 10;
  const searchLower = search.toLowerCase();
  const filteredLogs = search
    ? allLogs.filter(
        (log) =>
          log.authorName.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower),
      )
    : allLogs;
  const start = (page - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(start, start + pageSize);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleExport = useCallback((): void => {
    void (async () => {
      try {
        const blob = await exportAuditEventsCsv();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wildfire-audit-events.csv";
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to export audit logs.",
        );
      }
    })();
  }, []);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Logs"
        actions={
          <Button onClick={handleExport} disabled={!canExport}>
            <IconFileExport className="size-4" />
            Export Logs
          </Button>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <h2 className="text-base font-semibold">Search Results</h2>
          <LogSearchInput
            value={search}
            onChange={handleSearchChange}
            className="w-full max-w-none md:w-72"
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <LogsTable logs={paginatedLogs} />
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <LogsPagination
            page={page}
            pageSize={pageSize}
            total={filteredLogs.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
