"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";
import { IconFileExport } from "@tabler/icons-react";

import { DashboardPage } from "@/components/layout";
import { LogSearchInput } from "@/components/logs/log-search-input";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import {
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { LogEntry } from "@/types/log";

const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2023-04-15T08:43:31Z",
    authorId: "1",
    authorName: "Admin",
    description: 'User "Admin" logged in',
    metadata: { id: "1", name: "Admin" },
  },
];

export default function LogsPage(): ReactElement {
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const pageSize = 10;
  const searchLower = search.toLowerCase();
  const filteredLogs = search
    ? mockLogs.filter(
        (log) =>
          log.authorName.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower),
      )
    : mockLogs;
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
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.authorName,
      log.description,
      JSON.stringify(log.metadata),
    ]);
    const csv = [["timestamp", "author", "description", "metadata"], ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wildfire-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Logs"
        actions={
          <Button onClick={handleExport}>
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
