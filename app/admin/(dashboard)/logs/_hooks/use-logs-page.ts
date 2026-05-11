"use client";

import { useCallback, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useInfiniteUserOptions } from "@/hooks/use-infinite-user-options";
import {
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
import { useAuditLogFilters } from "./use-audit-log-filters";
import { useActorResolver } from "./use-actor-resolver";
import { LOGS_PAGE_SIZE } from "@/lib/audit-log-search-params";

export const PAGE_SIZE = LOGS_PAGE_SIZE;

export interface UseLogsPageResult {
  // Permissions
  canExport: boolean;
  canFlush: boolean;

  // Filter state
  filters: ReturnType<typeof useAuditLogFilters>;

  // Query data
  logs: LogEntry[];
  total: number;
  isFetching: boolean;
  authorOptions: readonly RbacUser[];
  isAuthorOptionsFetching: boolean;
  isAuthorOptionsLoadingMore: boolean;
  hasMoreAuthorOptions: boolean;
  loadMoreAuthorOptions: () => void;

  // Handlers
  handleSearchChange: (nextValue: string) => void;
  handleFromChange: (nextValue: string) => void;
  handleToChange: (nextValue: string) => void;
  handleAuthorChange: (nextValue: string) => void;
  handleResourceTypeChange: (nextValue: ResourceTypeFilter) => void;
  handleResourceTypeInputChange: (nextInputValue: string) => void;
  handleStatusChange: (nextValue: string) => void;
  handleResetFilters: () => void;
  selectedStatusValue: string | null;
}

const COMMON_STATUS_CODES = ["200", "401", "403", "404", "500"] as const;
const EMPTY_USERS: readonly RbacUser[] = [];
const EMPTY_DISPLAYS: readonly DisplayOption[] = [];

function normalizedAuditQueryKey(query: AuditListQuery | void): string {
  return JSON.stringify({
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? LOGS_PAGE_SIZE,
    q: query?.q ?? null,
    from: query?.from ?? null,
    to: query?.to ?? null,
    author: query?.author ?? null,
    resourceType: query?.resourceType ?? null,
    status: query?.status ?? null,
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
  const canReadAudit = useCan("audit:read");
  const canDeleteAudit = useCan("audit:delete");
  const canExport = canReadAudit;
  const canFlush = canReadAudit && canDeleteAudit;
  const filters = useAuditLogFilters(PAGE_SIZE);
  const isInitialEventsQuery =
    options?.initialEvents != null &&
    normalizedAuditQueryKey(options.initialEvents.queryArgs) ===
      normalizedAuditQueryKey(filters.listQuery);

  const { data: eventsData, isFetching } = useListAuditEventsQuery(
    filters.listQuery,
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  );
  const effectiveEventsData =
    eventsData ??
    (isInitialEventsQuery ? options?.initialEvents?.data : undefined);
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

  const users = usersData ?? options?.initialUsers ?? EMPTY_USERS;
  const {
    users: authorOptions,
    isFetching: isAuthorOptionsFetching,
    isLoadingMore: isAuthorOptionsLoadingMore,
    hasMore: hasMoreAuthorOptions,
    loadMore: loadMoreAuthorOptions,
  } = useInfiniteUserOptions({
    enabled: canReadUsers,
    search: filters.author,
    pageSize: 50,
  });
  const displays = displaysData ?? options?.initialDisplays ?? EMPTY_DISPLAYS;

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
    setSearch,
    setFromDraft,
    setToDraft,
    setAuthor,
    setResourceType,
    setResourceTypeInput,
    setStatusRaw,
  } = filters;

  const resetToFirstPage = useCallback((): void => {
    if (page !== 1) {
      setPage(1);
    }
  }, [page, setPage]);

  const handleSearchChange = useCallback(
    (nextValue: string): void => {
      setSearch(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setSearch],
  );

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

  const handleAuthorChange = useCallback(
    (nextValue: string): void => {
      setAuthor(nextValue);
      resetToFirstPage();
    },
    [resetToFirstPage, setAuthor],
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

  const handleResetFilters = useCallback((): void => {
    filters.resetAll();
  }, [filters]);

  return {
    canExport,
    canFlush,
    filters,
    logs,
    total,
    isFetching,
    authorOptions,
    isAuthorOptionsFetching,
    isAuthorOptionsLoadingMore,
    hasMoreAuthorOptions,
    loadMoreAuthorOptions,
    handleSearchChange,
    handleFromChange,
    handleToChange,
    handleAuthorChange,
    handleResourceTypeChange,
    handleResourceTypeInputChange,
    handleStatusChange,
    handleResetFilters,
    selectedStatusValue,
  };
}
