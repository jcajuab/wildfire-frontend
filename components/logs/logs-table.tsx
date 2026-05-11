"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import Image from "next/image";
import {
  IconDotsVertical,
  IconHistory,
  IconInfoCircle,
  IconUser,
} from "@tabler/icons-react";

import { TableEmptyState } from "@/components/common/table-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/formatters";
import type { LogEntry } from "@/types/log";
import { LogMetadataDialog } from "@/components/logs/log-metadata-dialog";

interface LogsTableProps {
  readonly logs: readonly LogEntry[];
  readonly emptyDescription?: string;
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const str = JSON.stringify(metadata);
  if (str.length > 30) {
    return `${str.substring(0, 27)}…`;
  }
  return str;
}

interface LogActionsMenuProps {
  readonly log: LogEntry;
  readonly onViewMetadata: (log: LogEntry) => void;
}

function LogActionsMenu({
  log,
  onViewMetadata,
}: LogActionsMenuProps): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for log ${log.id}`}
        >
          <IconDotsVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onSelect={() => onViewMetadata(log)}>
          <IconInfoCircle className="size-4" aria-hidden="true" />
          View Metadata
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LogsTable({
  logs,
  emptyDescription = "Logs will appear here as users authenticate and perform actions.",
}: LogsTableProps): ReactElement {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const handleMetadataClick = useCallback((log: LogEntry) => {
    setSelectedLog(log);
  }, []);

  const handleMetadataDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedLog(null);
  }, []);

  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-[220px]">Timestamp</TableHead>
            <TableHead className="w-[180px]">Author</TableHead>
            <TableHead className="w-[280px]">Description</TableHead>
            <TableHead className="min-w-[220px]">Metadata</TableHead>
            <TableHead className="w-[48px] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b">
          {logs.length === 0 ? (
            <TableEmptyState
              colSpan={5}
              title="No logs found"
              description={emptyDescription}
              icon={<IconHistory className="size-7" aria-hidden="true" />}
            />
          ) : null}
          {logs.map((log) => (
            <TableRow key={log.id} className="h-12">
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDateTime(log.occurredAt)}
              </TableCell>
              <TableCell>
                <div className="flex min-w-0 items-center gap-2">
                  {log.actorAvatarUrl ? (
                    <Image
                      src={log.actorAvatarUrl}
                      alt={`${log.actorName} avatar`}
                      width={28}
                      height={28}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <IconUser
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{log.actorName}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[28rem] space-y-0.5">
                  <p className="truncate">{log.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.technicalDescription}
                  </p>
                </div>
              </TableCell>
              <TableCell className="max-w-[22rem]">
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {formatMetadata(log.metadata)}
                </span>
              </TableCell>
              <TableCell className="w-[48px] text-right">
                <LogActionsMenu
                  log={log}
                  onViewMetadata={handleMetadataClick}
                />
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
