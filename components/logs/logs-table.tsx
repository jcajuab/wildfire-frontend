"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import Image from "next/image";
import { IconHistory, IconUser } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import type { LogEntry } from "@/types/log";
import { LogMetadataDialog } from "@/components/logs/log-metadata-dialog";

interface LogsTableProps {
  readonly logs: readonly LogEntry[];
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const str = JSON.stringify(metadata);
  if (str.length > 30) {
    return `${str.substring(0, 27)}…`;
  }
  return str;
}

export function LogsTable({ logs }: LogsTableProps): ReactElement {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const handleMetadataClick = useCallback((log: LogEntry) => {
    setSelectedLog(log);
  }, []);

  const handleMetadataDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedLog(null);
  }, []);

  if (logs.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No logs found"
          description="Logs will appear here as users authenticate and perform actions."
          icon={<IconHistory className="size-7" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Timestamp</TableHead>
            <TableHead className="w-[180px]">Author</TableHead>
            <TableHead className="w-[280px]">Description</TableHead>
            <TableHead>Metadata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">
                {formatDateTime(log.timestamp)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {log.authorAvatarUrl ? (
                    <Image
                      src={log.authorAvatarUrl}
                      alt="Author"
                      width={28}
                      height={28}
                      className="size-7 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <IconUser className="size-4 text-muted-foreground" />
                  )}
                  <span>{log.authorName}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <p>{log.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.technicalDescription}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleMetadataClick(log)}
                  className="w-full text-left cursor-pointer hover:underline focus:outline-none focus:underline rounded px-1 -mx-1"
                >
                  {formatMetadata(log.metadata)}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <LogMetadataDialog
        open={selectedLog != null}
        onOpenChange={handleMetadataDialogOpenChange}
        log={selectedLog}
      />
    </>
  );
}
