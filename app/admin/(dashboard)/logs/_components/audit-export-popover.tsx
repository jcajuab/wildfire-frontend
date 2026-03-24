import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AuditExportQuery } from "@/lib/api/audit-api";
import { exportAuditEventsCsv } from "@/lib/api/audit-api";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import { dateToISOEnd, dateToISOStart, isValidYyyyMmDd } from "@/lib/formatters";

interface AuditExportPopoverProps {
  readonly action: string;
  readonly actorType: "all" | "user" | "display";
  readonly resourceType: string;
  readonly parsedStatus: number | undefined;
  readonly requestId: string;
  readonly total: number;
}

export function AuditExportPopover({
  action,
  actorType,
  resourceType,
  parsedStatus,
  requestId,
  total,
}: AuditExportPopoverProps): ReactElement {
  const [exportPopoverOpen, setExportPopoverOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [localFrom, setLocalFrom] = useState("");
  const [localTo, setLocalTo] = useState("");

  useEffect(() => {
    if (exportPopoverOpen) {
      setLocalFrom("");
      setLocalTo("");
    }
  }, [exportPopoverOpen]);

  const exportRangeValid =
    isValidYyyyMmDd(localFrom.trim()) &&
    isValidYyyyMmDd(localTo.trim()) &&
    localFrom.trim() <= localTo.trim();
  const canDownload = exportRangeValid;

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
        from: dateToISOStart(fromTrimmed),
        to: dateToISOEnd(toTrimmed),
        action: action || undefined,
        actorType: actorType === "all" ? undefined : actorType,
        resourceType: resourceType || undefined,
        status: parsedStatus,
        requestId: requestId || undefined,
      };
      const blob = await exportAuditEventsCsv(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wildfire-audit-events.csv";
      link.click();
      URL.revokeObjectURL(url);
      setExportPopoverOpen(false);
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
    <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
      <PopoverTrigger asChild>
        <Button>
          <IconFileExport className="size-4" />
          Export Logs
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="export-from">From</Label>
              <DateInput
                id="export-from"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="export-to">To</Label>
              <DateInput
                id="export-to"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Export applies your active table filters.
          </p>
          {total > 100000 && (
            <p className="text-xs text-muted-foreground">
              Current result set may exceed backend export limits.
            </p>
          )}
          {!exportRangeValid &&
            isValidYyyyMmDd(localFrom.trim()) &&
            isValidYyyyMmDd(localTo.trim()) && (
            <p className="text-destructive text-xs">
              From date must be before or equal to To date.
            </p>
            )}
          <Button
            onClick={handleExportSubmit}
            disabled={!canDownload || isExporting}
            className="w-full"
          >
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
