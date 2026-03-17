"use client";

import { useCallback, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useListAuditEventsQuery } from "@/lib/api/audit-api";
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import { useGetUsersQuery } from "@/lib/api/rbac-api";
import {
  getResourceTypeLabel,
  getResourceTypeValueFromInput,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";
import {
  useAuditLogFilters,
  ACTOR_TYPE_FILTERS,
  type ActorTypeFilter,
} from "./_hooks/use-audit-log-filters";
import { useActorResolver } from "./_hooks/use-actor-resolver";

export { ACTOR_TYPE_FILTERS, type ActorTypeFilter };

export const PAGE_SIZE = 20;

export interface UseLogsPageResult {
  // Permissions
  canExport: boolean;

  // Filter state
  filters: ReturnType<typeof useAuditLogFilters>;

  // Query data
  logs: LogEntry[];
  total: number;

  // Handlers
  handleFromChange: (nextValue: string) => void;
  handleToChange: (nextValue: string) => void;
  handleActionChange: (nextValue: string) => void;
  handleActorTypeChange: (nextValue: ActorTypeFilter) => void;
  handleResourceTypeChange: (nextValue: ResourceTypeFilter) => void;
  handleResourceTypeInputChange: (nextInputValue: string) => void;
  handleStatusChange: (nextValue: string) => void;
  handleRequestIdChange: (nextValue: string) => void;
  handleResetFilters: () => void;
  selectedStatusValue: string | null;
}

const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;

export function useLogsPage(): UseLogsPageResult {
  const canExport = useCan("audit:read");
  const filters = useAuditLogFilters(PAGE_SIZE);

  const { data } = useListAuditEventsQuery(filters.listQuery);
  const canReadUsers = useCan("users:read");
  const canReadDisplays = useCan("displays:read");
  const { data: usersData } = useGetUsersQuery(
    { page: 1, pageSize: 100 },
    { skip: !canReadUsers },
  );
  const { data: displaysData } = useGetDisplaysQuery(
    { page: 1, pageSize: 100 },
    { skip: !canReadDisplays },
  );

  const users = usersData?.items ?? [];
  const displays = displaysData?.items ?? [];

  const actorResolver = useActorResolver({ users, displays });

  const logs = useMemo<LogEntry[]>(() => {
    return (data?.items ?? []).map((event) =>
      mapAuditEventToLogEntry(event, {
        getActorName: actorResolver.getActorName,
        getActorAvatarUrl: actorResolver.getActorAvatarUrl,
      }),
    );
  }, [data?.items, actorResolver]);

  const total = data?.total ?? 0;

  const resetToFirstPage = useCallback((): void => {
    if (filters.page !== 1) {
      filters.setPage(1);
    }
  }, [filters]);

  const handleFromChange = useCallback(
    (nextValue: string): void => {
      filters.setFrom(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleToChange = useCallback(
    (nextValue: string): void => {
      filters.setTo(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleActionChange = useCallback(
    (nextValue: string): void => {
      filters.setActionDraft(nextValue);
    },
    [filters],
  );

  const handleActorTypeChange = useCallback(
    (nextValue: ActorTypeFilter): void => {
      filters.setActorType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleResourceTypeChange = useCallback(
    (nextValue: ResourceTypeFilter): void => {
      filters.setResourceType(nextValue);
      filters.setResourceTypeInput(
        nextValue === "" ? "" : getResourceTypeLabel(nextValue),
      );
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const handleResourceTypeInputChange = useCallback(
    (nextInputValue: string): void => {
      const resolvedValue = getResourceTypeValueFromInput(nextInputValue);

      if (resolvedValue !== null && resolvedValue !== "") {
        filters.setResourceType(resolvedValue);
        filters.setResourceTypeInput(getResourceTypeLabel(resolvedValue));
        resetToFirstPage();
        return;
      }

      filters.setResourceTypeInput(nextInputValue);
      if (nextInputValue === "") {
        filters.setResourceType("");
        resetToFirstPage();
      }
    },
    [resetToFirstPage, filters],
  );

  const handleStatusChange = useCallback(
    (nextValue: string): void => {
      filters.setStatusRaw(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, filters],
  );

  const selectedStatusValue = useMemo<string | null>(() => {
    return COMMON_STATUS_CODES.includes(
      filters.statusRaw as (typeof COMMON_STATUS_CODES)[number],
    )
      ? filters.statusRaw
      : null;
  }, [filters.statusRaw]);

  const handleRequestIdChange = useCallback(
    (nextValue: string): void => {
      filters.setRequestIdDraft(nextValue);
    },
    [filters],
  );

  const handleResetFilters = useCallback((): void => {
    filters.setFrom("");
    filters.setTo("");
    filters.setAction("");
    filters.setActionDraft("");
    filters.setActorType("all");
    filters.setResourceType("");
    filters.setResourceTypeInput("");
    filters.setStatusRaw("");
    filters.setRequestId("");
    filters.setRequestIdDraft("");
    filters.setPage(1);
  }, [filters]);

  return {
    canExport,
    filters,
    logs,
    total,
    handleFromChange,
    handleToChange,
    handleActionChange,
    handleActorTypeChange,
    handleResourceTypeChange,
    handleResourceTypeInputChange,
    handleStatusChange,
    handleRequestIdChange,
    handleResetFilters,
    selectedStatusValue,
  };
}
