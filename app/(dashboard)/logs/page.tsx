"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconFileExport } from "@tabler/icons-react";
import { toast } from "sonner";

import { DashboardPage } from "@/components/layout";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useCan } from "@/hooks/use-can";
import {
  type AuditExportQuery,
  type AuditListQuery,
  exportAuditEventsCsv,
  useListAuditEventsQuery,
} from "@/lib/api/audit-api";
import { useGetDevicesQuery } from "@/lib/api/devices-api";
import { useGetUsersQuery } from "@/lib/api/rbac-api";
import { dateToISOEnd, dateToISOStart } from "@/lib/formatters";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogEntry } from "@/types/log";

const PAGE_SIZE = 20;
const ACTOR_TYPE_FILTERS = ["all", "user", "device"] as const;
type ActorTypeFilter = (typeof ACTOR_TYPE_FILTERS)[number];
const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const STATUS_CODE_LABELS: Record<(typeof COMMON_STATUS_CODES)[number], string> =
  {
    "200": "200 (OK)",
    "401": "401 (Unauthorized)",
    "403": "403 (Forbidden)",
    "404": "404 (Not Found)",
    "500": "500 (Internal Server Error)",
  };

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
  const [from, setFrom] = useQueryStringState("from", "");
  const [to, setTo] = useQueryStringState("to", "");
  const [action, setAction] = useQueryStringState("action", "");
  const [requestId, setRequestId] = useQueryStringState("requestId", "");
  const [resourceType, setResourceType] = useQueryStringState(
    "resourceType",
    "",
  );
  const [statusRaw, setStatusRaw] = useQueryStringState("status", "");
  const [actorType, setActorType] = useQueryEnumState<ActorTypeFilter>(
    "actorType",
    "all",
    ACTOR_TYPE_FILTERS,
  );
  const [exportPopoverOpen, setExportPopoverOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const parsedStatus = useMemo<number | undefined>(() => {
    const parsed = Number.parseInt(statusRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 599) {
      return undefined;
    }
    return parsed;
  }, [statusRaw]);

  const listQuery = useMemo<AuditListQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      from: from ? dateToISOStart(from) : undefined,
      to: to ? dateToISOEnd(to) : undefined,
      action: action || undefined,
      actorType: actorType === "all" ? undefined : actorType,
      resourceType: resourceType || undefined,
      status: parsedStatus,
      requestId: requestId || undefined,
    }),
    [action, actorType, from, page, parsedStatus, requestId, resourceType, to],
  );

  const { data } = useListAuditEventsQuery(listQuery);
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

  const isRangeValid = from.trim() !== "" && to.trim() !== "" && from <= to;
  const canDownload = isRangeValid;

  const resetToFirstPage = useCallback((): void => {
    if (page !== 1) {
      setPage(1);
    }
  }, [page, setPage]);

  const handleFromChange = useCallback(
    (nextValue: string): void => {
      setFrom(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setFrom],
  );

  const handleToChange = useCallback(
    (nextValue: string): void => {
      setTo(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setTo],
  );

  const handleActionChange = useCallback(
    (nextValue: string): void => {
      setAction(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setAction],
  );

  const handleActorTypeChange = useCallback(
    (nextValue: ActorTypeFilter): void => {
      setActorType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setActorType],
  );

  const handleResourceTypeChange = useCallback(
    (nextValue: string): void => {
      setResourceType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setResourceType],
  );

  const handleStatusChange = useCallback(
    (nextValue: string): void => {
      setStatusRaw(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setStatusRaw],
  );

  const selectedStatusValue = useMemo<string | null>(() => {
    return COMMON_STATUS_CODES.includes(
      statusRaw as (typeof COMMON_STATUS_CODES)[number],
    )
      ? statusRaw
      : null;
  }, [statusRaw]);

  const handleRequestIdChange = useCallback(
    (nextValue: string): void => {
      setRequestId(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setRequestId],
  );

  const handleExportSubmit = useCallback(async (): Promise<void> => {
    setIsExporting(true);
    try {
      const query: AuditExportQuery = {
        from: dateToISOStart(from),
        to: dateToISOEnd(to),
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
      const message =
        err instanceof Error ? err.message : "Failed to export audit logs.";
      if (message.includes("Export limit exceeded")) {
        toast.error(
          "Export is too large for one file. Narrow your filters or date range.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setIsExporting(false);
    }
  }, [action, actorType, from, parsedStatus, requestId, resourceType, to]);

  const handleResetFilters = useCallback((): void => {
    setFrom("");
    setTo("");
    setAction("");
    setActorType("all");
    setResourceType("");
    setStatusRaw("");
    setRequestId("");
    setPage(1);
  }, [
    setAction,
    setActorType,
    setFrom,
    setPage,
    setRequestId,
    setResourceType,
    setStatusRaw,
    setTo,
  ]);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Logs"
        actions={
          canExport ? (
            <Popover
              open={exportPopoverOpen}
              onOpenChange={setExportPopoverOpen}
            >
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
                        onChange={(e) => handleFromChange(e.target.value)}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Label htmlFor="export-to">To</Label>
                      <Input
                        id="export-to"
                        type="date"
                        value={to}
                        onChange={(e) => handleToChange(e.target.value)}
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
                  {!isRangeValid && from !== "" && to !== "" && (
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
          ) : null
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content className="flex-none border-b pb-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-from">From</Label>
              <Input
                id="logs-filter-from"
                type="date"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-to">To</Label>
              <Input
                id="logs-filter-to"
                type="date"
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-action">Action</Label>
              <Input
                id="logs-filter-action"
                value={action}
                onChange={(e) => handleActionChange(e.target.value)}
                placeholder="e.g. auth.session or rbac.user.update"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-request-id">Request ID</Label>
              <Input
                id="logs-filter-request-id"
                value={requestId}
                onChange={(e) => handleRequestIdChange(e.target.value)}
                placeholder="e.g. 2be5fd5a or full UUID"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Actor Type</Label>
              <Select
                value={actorType}
                onValueChange={(value) => {
                  if (ACTOR_TYPE_FILTERS.includes(value as ActorTypeFilter)) {
                    handleActorTypeChange(value as ActorTypeFilter);
                  }
                }}
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="All actor types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="device">Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-resource-type">Resource Type</Label>
              <Input
                id="logs-filter-resource-type"
                value={resourceType}
                onChange={(e) => handleResourceTypeChange(e.target.value)}
                placeholder="e.g. user, content, schedule"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logs-filter-status">Status</Label>
              <Combobox
                value={selectedStatusValue}
                inputValue={statusRaw}
                onValueChange={(nextValue) =>
                  handleStatusChange(nextValue ?? "")
                }
                onInputValueChange={(nextInputValue) =>
                  handleStatusChange(nextInputValue)
                }
              >
                <ComboboxInput
                  id="logs-filter-status"
                  inputMode="numeric"
                  placeholder="Type 100-599 or choose common code"
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>No matching status code.</ComboboxEmpty>
                  <ComboboxList>
                    {COMMON_STATUS_CODES.map((code) => (
                      <ComboboxItem key={code} value={code}>
                        {STATUS_CODE_LABELS[code]}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </DashboardPage.Content>
        <DashboardPage.Content className="pt-4">
          <div className="overflow-hidden rounded-lg border">
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
