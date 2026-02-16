"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { DashboardPage } from "@/components/layout";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQueryNumberState } from "@/hooks/use-query-state";
import { useCan } from "@/hooks/use-can";
import {
  exportAuditEventsCsv,
  useListAuditEventsQuery,
} from "@/lib/api/audit-api";
import { useGetDevicesQuery } from "@/lib/api/devices-api";
import { useGetUsersQuery } from "@/lib/api/rbac-api";
import { dateToISOEnd, dateToISOStart } from "@/lib/formatters";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";

const PAGE_SIZE = 20;

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDefaultExportRange(): { from: string; to: string } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: toYYYYMMDD(thirtyDaysAgo), to: toYYYYMMDD(now) };
}

function formatActorDisplay(
  userMap: Map<string, string>,
  deviceMap: Map<string, string>,
): (actorId: string, actorType: string | null) => string {
  return (actorId: string, actorType: string | null) => {
    if (actorType === "user") {
      return userMap.get(actorId) ?? "Unknown user";
    }
    if (actorType === "device") {
      return deviceMap.get(actorId) ?? "Device";
    }
    return actorType ?? "Unknown";
  };
}

function getActorAvatarUrl(
  avatarUrlByUserId: Map<string, string | null>,
): (actorId: string, actorType: string | null) => string | null {
  return (actorId: string, actorType: string | null) => {
    if (actorType === "user") {
      return avatarUrlByUserId.get(actorId) ?? null;
    }
    return null;
  };
}

export default function LogsPage(): ReactElement {
  const canExport = useCan("audit:export");
  const [page, setPage] = useQueryNumberState("page", 1);
  const defaultRange = useMemo(() => getDefaultExportRange(), []);
  const [exportFrom, setExportFrom] = useState<string>(defaultRange.from);
  const [exportTo, setExportTo] = useState<string>(defaultRange.to);
  const [exportPopoverOpen, setExportPopoverOpen] = useState<boolean>(false);

  const { data } = useListAuditEventsQuery({ page, pageSize: PAGE_SIZE });
  const { data: users = [] } = useGetUsersQuery();
  const { data: devicesData } = useGetDevicesQuery();

  const logs = useMemo<LogEntry[]>(() => {
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const avatarUrlByUserId = new Map(
      users.map((u) => [u.id, u.avatarUrl ?? null]),
    );
    const deviceMap = new Map(
      (devicesData?.items ?? []).map((d) => [d.id, d.name || d.identifier]),
    );
    const getActorName = formatActorDisplay(userMap, deviceMap);
    const getActorAvatarUrlFn = getActorAvatarUrl(avatarUrlByUserId);
    return (data?.items ?? []).map((event) =>
      mapAuditEventToLogEntry(event, {
        getActorName,
        getActorAvatarUrl: getActorAvatarUrlFn,
      }),
    );
  }, [data?.items, users, devicesData?.items]);

  const total = data?.total ?? 0;

  const isRangeValid =
    exportFrom.trim() !== "" &&
    exportTo.trim() !== "" &&
    exportFrom <= exportTo;
  const canDownload = isRangeValid;

  const handleExportSubmit = useCallback((): void => {
    void (async () => {
      try {
        const query = {
          from: dateToISOStart(exportFrom),
          to: dateToISOEnd(exportTo),
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
        toast.error(
          err instanceof Error ? err.message : "Failed to export audit logs.",
        );
      }
    })();
  }, [exportFrom, exportTo]);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title='Logs'
        actions={
          canExport ? (
            <Popover
              open={exportPopoverOpen}
              onOpenChange={setExportPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button>
                  <IconFileExport className='size-4' />
                  Export Logs
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-80' align='end'>
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3'>
                    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                      <Label htmlFor='export-from'>From</Label>
                      <Input
                        id='export-from'
                        type='date'
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                      />
                    </div>
                    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                      <Label htmlFor='export-to'>To</Label>
                      <Input
                        id='export-to'
                        type='date'
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                      />
                    </div>
                  </div>
                  {!isRangeValid && exportFrom !== "" && exportTo !== "" && (
                    <p className='text-destructive text-xs'>
                      From date must be before or equal to To date.
                    </p>
                  )}
                  <Button
                    onClick={handleExportSubmit}
                    disabled={!canDownload}
                    className='w-full'
                  >
                    Download CSV
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content className='pt-6'>
          <div className='overflow-hidden rounded-lg border'>
            <LogsTable logs={logs} />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <LogsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
