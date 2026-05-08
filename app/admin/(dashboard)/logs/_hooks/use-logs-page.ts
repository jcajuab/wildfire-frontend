"use client";

import { useCallback, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import {
  auditApi,
  useListAuditEventsQuery,
  type AuditListQuery,
  type BackendAuditListResponse,
} from "@/lib/api/audit-api";
import { useGetUserOptionsQuery, type RbacUser } from "@/lib/api/rbac-api";
import {
  useGetDisplayOptionsQuery,
  type DisplayOption,
} from "@/lib/api/displays-api";
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
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

export { ACTOR_TYPE_FILTERS, type ActorTypeFilter };

export const PAGE_SIZE = LOGS_PAGE_SIZE;

export interface UseLogsPageResult {
  // Permissions
  canExport: boolean;

  // Filter state
  filters: ReturnType<typeof useAuditLogFilters>;

  // Query data
  logs: LogEntry[];
  total: number;
  isFetching: boolean;

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

function normalizedAuditQueryKey(query: AuditListQuery | void): string {
  return JSON.stringify({
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? LOGS_PAGE_SIZE,
    from: query?.from ?? null,
    to: query?.to ?? null,
    action: query?.action ?? null,
    actorId: query?.actorId ?? null,
    actorType: query?.actorType ?? null,
    resourceId: query?.resourceId ?? null,
    resourceType: query?.resourceType ?? null,
    status: query?.status ?? null,
    requestId: query?.requestId ?? null,
  });
}

export function useLogsPage(options?: {
  readonly initialEvents?: {
    readonly queryArgs: AuditListQuery;
    readonly data: BackendAuditListResponse;
  };
  readonly initialUsers?: readonly RbacUser[];
  readonly initialDisplays?: readonly DisplayOption[];
}): UseLogsPageResult {
  const canExport = useCan("audit:read");
  const filters = useAuditLogFilters(PAGE_SIZE);
  const isInitialEventsQuery =
    options?.initialEvents != null &&
    normalizedAuditQueryKey(options.initialEvents.queryArgs) ===
      normalizedAuditQueryKey(filters.listQuery);

  const { data: eventsData, isFetching: queryIsFetching } =
    useListAuditEventsQuery(filters.listQuery, {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: isInitialEventsQuery,
    });
  const cachedInitialEvents = auditApi.endpoints.listAuditEvents.useQueryState(
    filters.listQuery,
    { skip: !isInitialEventsQuery },
  );
  const effectiveEventsData =
    eventsData ??
    cachedInitialEvents.data ??
    (isInitialEventsQuery ? options?.initialEvents?.data : undefined);
  const isFetching = isInitialEventsQuery
    ? cachedInitialEvents.isFetching
    : queryIsFetching;
  const canReadUsers = useCan("users:read");
  const canReadDisplays = useCan("displays:read");

  const { data: usersData } = useGetUserOptionsQuery(undefined, {
    skip: !canReadUsers,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const { data: displaysData } = useGetDisplayOptionsQuery(undefined, {
    skip: !canReadDisplays,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const users = usersData ?? options?.initialUsers ?? [];
  const displays = displaysData ?? options?.initialDisplays ?? [];

  const actorResolver = useActorResolver({ users, displays });

  const logs = useMemo<LogEntry[]>(() => {
    return (effectiveEventsData?.items ?? []).map((event) =>
      mapAuditEventToLogEntry(event, {
        getActorName: actorResolver.getActorName,
        getActorAvatarUrl: actorResolver.getActorAvatarUrl,
      }),
    );
  }, [effectiveEventsData?.items, actorResolver]);

  const total = effectiveEventsData?.total ?? 0;

  const { page, setPage } = filters;
  const {
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
      resetToFirstPage();
    },
    [resetToFirstPage, setRequestId],
  );

  const handleResetFilters = useCallback((): void => {
    filters.resetAll();
  }, [filters]);

  return {
    canExport,
    filters,
    logs,
    total,
    isFetching,
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
