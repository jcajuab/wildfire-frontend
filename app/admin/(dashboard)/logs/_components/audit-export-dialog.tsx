"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { AuditExportQuery } from "@/lib/api/audit-api";
import { exportAuditEventsCsv } from "@/lib/api/audit-api";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  dateToISOEnd,
  dateToISOStart,
  isValidYyyyMmDd,
} from "@/lib/formatters";

interface AuditExportDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly q: string;
  readonly author: string;
  readonly resourceType: string;
  readonly parsedStatus: number | undefined;
  readonly total: number;
}

export function AuditExportDialog({
  open,
  onOpenChange,
  q,
  author,
  resourceType,
  parsedStatus,
  total,
}: AuditExportDialogProps): ReactElement {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [localFrom, setLocalFrom] = useState("");
  const [localTo, setLocalTo] = useState("");

  useEffect(() => {
    if (open) {
      setLocalFrom("");
      setLocalTo("");
    }
  }, [open]);

  const exportRangeValid =
    isValidYyyyMmDd(localFrom.trim()) &&
    isValidYyyyMmDd(localTo.trim()) &&
    localFrom.trim() <= localTo.trim();

  const handleExportSubmit = async (): Promise<void> => {
    const fromTrimmed = localFrom.trim();
    const toTrimmed = localTo.trim();
    if (
      !isValidYyyyMmDd(fromTrimmed) ||
      !isValidYyyyMmDd(toTrimmed) ||
      fromTrimmed > toTrimmed
    ) {
      return;
    }

    setIsExporting(true);
    try {
      const query: AuditExportQuery = {
        q: q || undefined,
        from: dateToISOStart(fromTrimmed),
        to: dateToISOEnd(toTrimmed),
        author: author || undefined,
        resourceType: resourceType || undefined,
        status: parsedStatus,
      };
      const blob = await exportAuditEventsCsv(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wildfire-audit-events.csv";
      link.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
      toast.success("Logs exported.");
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to export audit logs.");
      if (message.includes("Export limit exceeded")) {
        notifyApiError(
          err,
          "Export is too large for one file. Narrow your filters or date range.",
        );
      } else {
        notifyApiError(err, message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Logs</DialogTitle>
          <DialogDescription>
            Export audit logs within a date range. Active search and filter
            settings are included.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="export-from">From</Label>
              <DateInput
                id="export-from"
                value={localFrom}
                onChange={(event) => setLocalFrom(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="export-to">To</Label>
              <DateInput
                id="export-to"
                value={localTo}
                onChange={(event) => setLocalTo(event.target.value)}
              />
            </div>
          </div>
          {total > 100000 ? (
            <p className="text-xs text-muted-foreground">
              Current results may exceed backend export limits. Narrow the date
              range if the export fails.
            </p>
          ) : null}
          {!exportRangeValid &&
          isValidYyyyMmDd(localFrom.trim()) &&
          isValidYyyyMmDd(localTo.trim()) ? (
            <p className="text-destructive text-xs">
              From date must be before or equal to To date.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExportSubmit}
            disabled={!exportRangeValid || isExporting}
          >
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
