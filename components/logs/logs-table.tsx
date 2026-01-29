"use client";

import { IconAdjustmentsHorizontal, IconUser } from "@tabler/icons-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LogEntry } from "@/types/log";

interface LogsTableProps {
  readonly logs: readonly LogEntry[];
}

interface FilterableHeaderProps {
  readonly label: string;
}

function FilterableHeader({
  label,
}: FilterableHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      {label}
      <IconAdjustmentsHorizontal className="size-4 opacity-50" />
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${year}-${month}-${day}, ${String(hour12).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const str = JSON.stringify(metadata);
  if (str.length > 30) {
    return str.substring(0, 27) + "...";
  }
  return str;
}

export function LogsTable({ logs }: LogsTableProps): React.ReactElement {
  if (logs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">No logs found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[220px]">
            <FilterableHeader label="Timestamp" />
          </TableHead>
          <TableHead className="w-[180px]">
            <FilterableHeader label="Author" />
          </TableHead>
          <TableHead className="w-[280px]">Description</TableHead>
          <TableHead>Metadata</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-muted-foreground">
              {formatTimestamp(log.timestamp)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <IconUser className="size-4 text-muted-foreground" />
                <span>{log.authorName}</span>
              </div>
            </TableCell>
            <TableCell>{log.description}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {formatMetadata(log.metadata)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
