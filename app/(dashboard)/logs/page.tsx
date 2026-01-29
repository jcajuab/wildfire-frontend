"use client";

import { useState, useMemo } from "react";
import { IconFileExport } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { LogsTable, LogSearchInput, LogsPagination } from "@/components/logs";
import type { LogEntry } from "@/types/log";

// Mock logs - will be replaced with API data
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

  const handleExport = (): void => {
    // TODO: Implement log export
    console.log("Export logs");
  };

  // Filter logs based on search
  const filteredLogs = useMemo(() => {
    if (!search) return mockLogs;
    const searchLower = search.toLowerCase();
    return mockLogs.filter(
      (log) =>
        log.authorName.toLowerCase().includes(searchLower) ||
        log.description.toLowerCase().includes(searchLower),
    );
  }, [search]);

  // Paginate logs
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Logs">
        <Button onClick={handleExport}>
          <IconFileExport className="size-4" />
          Export Logs
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <LogSearchInput value={search} onChange={setSearch} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          <LogsTable logs={paginatedLogs} />
        </div>

        {/* Pagination */}
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
