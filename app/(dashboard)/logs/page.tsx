"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { DashboardPage } from "@/components/layout";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import { useQueryNumberState } from "@/hooks/use-query-state";
import { useCan } from "@/hooks/use-can";
import {
  exportAuditEventsCsv,
  useListAuditEventsQuery,
} from "@/lib/api/audit-api";
import { useGetDevicesQuery } from "@/lib/api/devices-api";
import { useGetUsersQuery } from "@/lib/api/rbac-api";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";

const PAGE_SIZE = 20;

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

export default function LogsPage(): ReactElement {
  const canExport = useCan("audit:export");
  const [page, setPage] = useQueryNumberState("page", 1);
  const { data } = useListAuditEventsQuery({ page, pageSize: PAGE_SIZE });
  const { data: users = [] } = useGetUsersQuery();
  const { data: devicesData } = useGetDevicesQuery();

  const logs = useMemo<LogEntry[]>(() => {
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const deviceMap = new Map(
      (devicesData?.items ?? []).map((d) => [d.id, d.name || d.identifier]),
    );
    const getActorName = formatActorDisplay(userMap, deviceMap);
    return (data?.items ?? []).map((event) =>
      mapAuditEventToLogEntry(event, { getActorName }),
    );
  }, [data?.items, users, devicesData?.items]);

  const total = data?.total ?? 0;

  const handleExport = useCallback((): void => {
    void (async () => {
      try {
        const blob = await exportAuditEventsCsv();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wildfire-audit-events.csv";
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to export audit logs.",
        );
      }
    })();
  }, []);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title='Logs'
        actions={
          <Button onClick={handleExport} disabled={!canExport}>
            <IconFileExport className='size-4' />
            Export Logs
          </Button>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content className='pt-6'>
          <LogsTable logs={logs} />
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
