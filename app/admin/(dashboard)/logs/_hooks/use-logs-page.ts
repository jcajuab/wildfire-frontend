"use client";

import { useCallback, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useListAuditEventsQuery } from "@/lib/api/audit-api";
import { useGetDisplayOptionsQuery } from "@/lib/api/displays-api";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";
import {
  getResourceTypeFilterLabel,
  getResourceTypeValueFromInput,
  type ResourceTypeFilter,
} from "@/lib/audit-resource-types";
import { mapAuditEventToLogEntry } from "@/lib/mappers/audit-log-mapper";
import type { LogEntry } from "@/types/log";
import {
  useAuditLogFilters,
  ACTOR_TYPE_FILTERS,
  type ActorTypeFilter,
} from "./use-audit-log-filters";
import { useActorResolver } from "./use-actor-resolver";

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
  const { data: usersData } = useGetUserOptionsQuery(undefined, {
    skip: !canReadUsers,
  });
  const { data: displaysData } = useGetDisplayOptionsQuery(undefined, {
    skip: !canReadDisplays,
  });

  const users = usersData ?? [];
  const displays = displaysData ?? [];

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

  const { page, setPage } = filters;
  const {
    setFrom,
    setTo,
    setFromDraft,
    setToDraft,
    setAction,
    setActorType,
    setResourceType,
    setResourceTypeInput,
    setStatusRaw,
    setRequestId,
  } = filters;

  const resetToFirstPage = useCallback((): void => {
    if (page !== 1) {
      setPage(1);
    }
  }, [page, setPage]);

  const handleFromChange = useCallback(
    (nextValue: string): void => {
      setFromDraft(nextValue);
    },
    [setFromDraft],
  );

  const handleToChange = useCallback(
    (nextValue: string): void => {
      setToDraft(nextValue);
    },
    [setToDraft],
  );

  const handleActionChange = useCallback(
    (nextValue: string): void => {
      setAction(nextValue);
    },
    [setAction],
  );

  const handleActorTypeChange = useCallback(
    (nextValue: ActorTypeFilter): void => {
      setActorType(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setActorType],
  );

  const handleResourceTypeChange = useCallback(
    (nextValue: ResourceTypeFilter): void => {
      setResourceType(nextValue);
      setResourceTypeInput(getResourceTypeFilterLabel(nextValue));
      resetToFirstPage();
    },
    [resetToFirstPage, setResourceType, setResourceTypeInput],
  );

  const handleResourceTypeInputChange = useCallback(
    (nextInputValue: string): void => {
      const resolvedValue = getResourceTypeValueFromInput(nextInputValue);

      if (resolvedValue !== null) {
        setResourceType(resolvedValue);
        setResourceTypeInput(getResourceTypeFilterLabel(resolvedValue));
        resetToFirstPage();
        return;
      }

      setResourceTypeInput(nextInputValue);
      if (nextInputValue === "") {
        setResourceType("");
        resetToFirstPage();
      }
    },
    [resetToFirstPage, setResourceType, setResourceTypeInput],
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
      filters.statusRaw as (typeof COMMON_STATUS_CODES)[number],
    )
      ? filters.statusRaw
      : null;
  }, [filters.statusRaw]);

  const handleRequestIdChange = useCallback(
    (nextValue: string): void => {
      setRequestId(nextValue);
    },
    [setRequestId],
  );

  const handleResetFilters = useCallback((): void => {
    setFromDraft("");
    setToDraft("");
    setFrom("");
    setTo("");
    setAction("");
    setActorType("all");
    setResourceType("");
    setResourceTypeInput("");
    setStatusRaw("");
    setRequestId("");
    setPage(1);
  }, [
    setFromDraft,
    setToDraft,
    setFrom,
    setTo,
    setAction,
    setActorType,
    setResourceType,
    setResourceTypeInput,
    setStatusRaw,
    setRequestId,
    setPage,
  ]);

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
