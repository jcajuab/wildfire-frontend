"use client";

import type { ReactElement } from "react";
import { Fragment, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import type { LogEntry } from "@/types/log";

interface LogMetadataDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly log: LogEntry | null;
}

function formatMetadataValue(value: unknown): string {
  if (value == null) return "—";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatFieldLabel(key: string): string {
  const words = key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (["id", "url", "api", "ip", "http", "https"].includes(lower))
        return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function LogMetadataDialog({
  open,
  onOpenChange,
  log,
}: LogMetadataDialogProps): ReactElement | null {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const handleClose = (): void => onOpenChange(false);
  const handleDialogOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setShowAdvanced(false);
    }
    onOpenChange(nextOpen);
  };

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pb-3 pt-4">
          <DialogTitle>Request Metadata</DialogTitle>
          <DialogDescription>
            Incident details for this audit record.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border p-4">
          <div className="space-y-4">
            <section className="space-y-1">
              <p className="text-sm font-medium">
                {formatDateTime(log.occurredAt)}
              </p>
              <p className="text-xs text-muted-foreground wrap-break-word">
                {log.description}
              </p>
              <p className="text-xs text-muted-foreground wrap-break-word">
                {log.technicalDescription}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium">Summary Details</h3>
              <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                {Object.entries(log.metadata).map(([key, value]) => (
                  <Fragment key={key}>
                    <dt className="text-muted-foreground">
                      {formatFieldLabel(key)}
                    </dt>
                    <dd className="break-all text-foreground">
                      {formatMetadataValue(value)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </section>

            <div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto cursor-pointer px-0 text-xs hover:bg-transparent hover:text-primary"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
              </Button>
            </div>

            {showAdvanced && (
              <section className="space-y-3">
                <h3 className="text-xs font-medium">Technical Fields</h3>
                <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                  {Object.entries(log.rawMetadata).map(([key, value]) => (
                    <Fragment key={`raw-${key}`}>
                      <dt className="text-muted-foreground">
                        {formatFieldLabel(key)}
                      </dt>
                      <dd className="break-all text-foreground">
                        {formatMetadataValue(value)}
                      </dd>
                    </Fragment>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-4 py-3">
          <Button onClick={handleClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
