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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Metadata</DialogTitle>
          <DialogDescription>
            Incident details for this audit record.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {formatDateTime(log.occurredAt)}
                </span>
                <span className="text-xs text-muted-foreground wrap-break-word">
                  {log.description}
                </span>
                <span className="text-xs text-muted-foreground wrap-break-word">
                  {log.technicalDescription}
                </span>
              </div>

              <div className="pt-1 text-xs font-medium">Summary Details</div>

              <div className="grid grid-cols-[9rem_1fr] gap-y-2 text-xs">
                {Object.entries(log.metadata).map(([key, value]) => (
                  <Fragment key={key}>
                    <span className="pr-4 text-muted-foreground">
                      {formatFieldLabel(key)}
                    </span>
                    <span className="break-all">
                      {formatMetadataValue(value)}
                    </span>
                  </Fragment>
                ))}
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-xs cursor-pointer hover:text-primary hover:bg-transparent"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  {showAdvanced
                    ? "Hide advanced fields"
                    : "Show advanced fields"}
                </Button>
              </div>
              {showAdvanced && (
                <>
                  <div className="pt-1 text-xs font-medium">
                    Technical Fields
                  </div>
                  <div className="grid grid-cols-[9rem_1fr] gap-y-2 text-xs">
                    {Object.entries(log.rawMetadata).map(([key, value]) => (
                      <Fragment key={`raw-${key}`}>
                        <span className="pr-4 text-muted-foreground">
                          {formatFieldLabel(key)}
                        </span>
                        <span className="break-all">
                          {formatMetadataValue(value)}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
