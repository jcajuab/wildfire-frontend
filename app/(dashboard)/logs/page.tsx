"use client";

import { useState } from "react";
import { IconFileExport } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { LogSearchInput } from "@/components/logs/log-search-input";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
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

export default function LogsPage(): React.ReactElement {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const handleExport = (): void => {
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
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Logs">
        <Button onClick={handleExport}>
          <IconFileExport className="size-4" />
          Export Logs
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <LogSearchInput value={search} onChange={setSearch} />
        </div>

        <div className="flex-1 overflow-auto px-6">
          <LogsTable logs={paginatedLogs} />
        </div>

        <LogsPagination
          page={page}
          pageSize={pageSize}
          total={filteredLogs.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
