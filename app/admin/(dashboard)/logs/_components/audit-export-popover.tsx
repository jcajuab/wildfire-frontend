import type { ReactElement } from "react";
import { useState } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { dateToISOEnd, dateToISOStart } from "@/lib/formatters";

interface AuditExportPopoverProps {
  readonly from: string;
  readonly to: string;
  readonly action: string;
  readonly actionDraft: string;
  readonly actorType: "all" | "user" | "display";
  readonly resourceType: string;
  readonly parsedStatus: number | undefined;
  readonly requestId: string;
  readonly requestIdDraft: string;
  readonly total: number;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
  readonly onActionSync: () => void;
  readonly onRequestIdSync: () => void;
}

export function AuditExportPopover({
  from,
  to,
  action,
  actionDraft,
  actorType,
  resourceType,
  parsedStatus,
  requestId,
  requestIdDraft,
  total,
  onFromChange,
  onToChange,
  onActionSync,
  onRequestIdSync,
}: AuditExportPopoverProps): ReactElement {
  const [exportPopoverOpen, setExportPopoverOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportRangeValid = from.trim() !== "" && to.trim() !== "" && from <= to;
  const canDownload = exportRangeValid;

  const handleExportSubmit = async (): Promise<void> => {
    if (actionDraft !== action) {
      onActionSync();
    }
    if (requestIdDraft !== requestId) {
      onRequestIdSync();
    }

    setIsExporting(true);
    try {
      const query: AuditExportQuery = {
        from: dateToISOStart(from),
        to: dateToISOEnd(to),
        action: actionDraft || undefined,
        actorType: actorType === "all" ? undefined : actorType,
        resourceType: resourceType || undefined,
        status: parsedStatus,
        requestId: requestIdDraft || undefined,
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
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="export-to">To</Label>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(e) => onToChange(e.target.value)}
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
          {!exportRangeValid && from !== "" && to !== "" && (
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
