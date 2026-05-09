"use client";

import type { ReactElement } from "react";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FlushAuditEventsRequest,
  useFlushAuditEventsMutation,
} from "@/lib/api/audit-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { isValidYyyyMmDd } from "@/lib/formatters";

type FlushRange = "older-90" | "older-30" | "older-7" | "custom" | "all";

interface FlushLogsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFlushed?: () => void;
}

function buildRequest(
  range: FlushRange,
  customDate: string,
): FlushAuditEventsRequest | null {
  switch (range) {
    case "older-90":
      return { mode: "olderThanDays", days: 90 };
    case "older-30":
      return { mode: "olderThanDays", days: 30 };
    case "older-7":
      return { mode: "olderThanDays", days: 7 };
    case "custom":
      return isValidYyyyMmDd(customDate.trim())
        ? { mode: "beforeDate", date: customDate.trim() }
        : null;
    case "all":
      return { mode: "all" };
  }
}

export function FlushLogsDialog({
  open,
  onOpenChange,
  onFlushed,
}: FlushLogsDialogProps): ReactElement {
  const [range, setRange] = useState<FlushRange>("older-30");
  const [customDate, setCustomDate] = useState("");
  const [flushAuditEvents, { isLoading }] = useFlushAuditEventsMutation();
  const request = buildRequest(range, customDate);

  const handleFlush = async (): Promise<void> => {
    if (request == null) {
      return;
    }

    try {
      const result = await flushAuditEvents(request).unwrap();
      toast.success(
        `Flushed ${result.deleted} audit ${
          result.deleted === 1 ? "log" : "logs"
        }.`,
      );
      onOpenChange(false);
      onFlushed?.();
    } catch (error) {
      notifyApiError(error, "Failed to flush audit logs.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flush Logs</DialogTitle>
          <DialogDescription>
            Permanently delete audit logs for the selected range. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Flush Range</Label>
            <Select
              value={range}
              onValueChange={(value) => setRange(value as FlushRange)}
            >
              <SelectTrigger
                aria-label="Flush Range"
                className="w-full justify-between"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="older-90">Older than 90 days</SelectItem>
                <SelectItem value="older-30">Older than 30 days</SelectItem>
                <SelectItem value="older-7">Older than 7 days</SelectItem>
                <SelectItem value="custom">Before custom date</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {range === "custom" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="flush-before-date">Delete logs before</Label>
              <DateInput
                id="flush-before-date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
              />
            </div>
          ) : null}
          {range === "all" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              All existing audit logs will be deleted. A new flush event will be
              recorded after the deletion completes.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleFlush}
            disabled={request == null || isLoading}
          >
            {isLoading ? "Flushing..." : "Flush Logs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
