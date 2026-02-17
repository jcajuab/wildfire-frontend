"use client";

import type { ReactElement } from "react";
import { Fragment, useState } from "react";
import {
  IconFileText,
  IconHistory,
  IconListDetails,
} from "@tabler/icons-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Request metadata</DialogTitle>
          <DialogDescription>
            Incident details for this audit record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconHistory className="size-4" />
            Log entry
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start gap-2">
              <IconFileText className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium">
                  {formatDateTime(log.timestamp)}
                </span>
                <span className="text-xs text-muted-foreground wrap-break-word">
                  {log.description}
                </span>
                <span className="text-xs text-muted-foreground wrap-break-word">
                  {log.technicalDescription}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium pt-1">
              <IconListDetails className="size-4" />
              Summary details
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {Object.entries(log.metadata).map(([key, value]) => (
                <Fragment key={key}>
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-mono text-xs break-all">
                    {formatMetadataValue(value)}
                  </span>
                </Fragment>
              ))}
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-xs"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
              </Button>
            </div>
            {showAdvanced && (
              <>
                <div className="flex items-center gap-2 text-sm font-medium pt-1">
                  <IconListDetails className="size-4" />
                  Technical fields
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {Object.entries(log.rawMetadata).map(([key, value]) => (
                    <Fragment key={`raw-${key}`}>
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono text-xs break-all">
                        {formatMetadataValue(value)}
                      </span>
                    </Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
