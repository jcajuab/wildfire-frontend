"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useCan } from "@/hooks/use-can";
import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeToAuthState } from "@/lib/auth-session";
import { useDebounce } from "@/hooks/use-debounce";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  displaysApi,
  useLazyGetDisplaysQuery,
  useGetDisplaysBootstrapQuery,
  useLazyGetDisplaysBootstrapQuery,
} from "@/lib/api/displays-api";

import { dedupeDisplayGroupNames } from "@/lib/display-group-normalization";
import { normalizeDisplayOutputFilter } from "@/lib/display-output";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type { Display, DisplayOutputFilter } from "@/types/display";
import type {
  BackendDisplay,
  DisplaysBootstrapResponse,
  DisplayGroup,
  DisplaysListQuery,
  DisplaysListResponse,
} from "@/lib/api/displays-api";
import { useDisplayFilters } from "./use-display-filters";
import { useDisplayDialogState } from "./use-display-dialog-state";
import {
  DISPLAYS_BOOTSTRAP_PAGE_SIZE,
  DISPLAYS_PAGE_SIZE,
} from "@/lib/displays-search-params";
import { useDisplayCrudHandlers } from "./use-display-crud-handlers";

export const PAGE_SIZE = DISPLAYS_PAGE_SIZE;
const BOOTSTRAP_PAGE_SIZE = DISPLAYS_BOOTSTRAP_PAGE_SIZE;
const UNFILTERED_DISPLAY_QUERY: DisplaysListQuery = {
  page: 1,
  pageSize: BOOTSTRAP_PAGE_SIZE,
  sortBy: "name",
  sortDirection: "asc",
};

interface RemainingDisplayRowsState {
  readonly key: string;
  readonly rows: readonly BackendDisplay[];
}

export interface InitialDisplaysBootstrap {
  readonly queryArgs: DisplaysListQuery;
  readonly data: DisplaysBootstrapResponse;
  readonly isSeeded: boolean;
}

interface UseDisplaysPageOptions {
  readonly initialBootstrap?: InitialDisplaysBootstrap;
}

export interface UseDisplaysPageResult {
  // Permissions
  canReadDisplays: boolean;
  canCreateDisplay: boolean;
  canManageDisplayGroups: boolean;
  canUpdateDisplay: boolean;
  canDeleteDisplay: boolean;

  // Filter state
  statusFilter: DisplayStatusFilter;
  search: string;
  page: number;
  groupFilters: readonly string[];
  normalizedOutputFilter: DisplayOutputFilter;
  availableGroupFilters: readonly string[];
  availableOutputFilters: readonly string[];

  // Query data
  displays: Display[];
  displaysData: DisplaysListResponse | undefined;
  displayGroupsData: DisplayGroup[];
  globalEmergencyActive: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  loadErrorMessage: string;

  // Dialog state
  isAddInfoDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isUnregisterDialogOpen: boolean;
  selectedDisplay: Display | null;
  displayToUnregister: Display | null;

  // Dialog setters
  setIsAddInfoDialogOpen: (open: boolean) => void;
  setPage: (page: number) => void;

  // Handlers
  refetch: () => void;
  handleStatusFilterChange: (value: DisplayStatusFilter) => void;
  handleSearchChange: (value: string) => void;
  handleGroupFilterChange: (value: readonly string[]) => void;
  handleOutputFilterChange: (value: DisplayOutputFilter) => void;
  handleClearFilters: () => void;
  handleViewPage: (display: Display) => void;
  handleUnregisterDisplay: (display: Display) => void;
  handleUnregisterDialogOpenChange: (open: boolean) => void;
  handleConfirmUnregisterDisplay: () => Promise<void>;
  unregisterDisplayById: (displayId: string) => Promise<void>;
  handleEditDisplay: (display: Display) => void;
  handleSaveDisplay: (display: Display) => Promise<boolean>;
  handleEditDialogOpenChange: (open: boolean) => void;
}

function normalizedQueryKey(query: DisplaysListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    q: query.q ?? null,
    status: query.status ?? null,
    groupNames: query.groupNames ?? null,
    output: query.output ?? null,
    sortBy: query.sortBy ?? "name",
    sortDirection: query.sortDirection ?? "asc",
  });
}

function displayMatchesSearch(display: Display, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (query.length === 0) return true;

  return (
    display.name.toLowerCase().includes(query) ||
    display.slug.toLowerCase().includes(query)
  );
}

function displayMatchesGroups(
  display: Display,
  selectedGroups: readonly string[],
): boolean {
  if (selectedGroups.length === 0) return true;
  return display.groups.some((group) => selectedGroups.includes(group.name));
}

function displayMatchesOutput(
  display: Display,
  selectedOutput: DisplayOutputFilter,
): boolean {
  if (selectedOutput === "all") return true;
  return normalizeDisplayOutputFilter(display.output) === selectedOutput;
}

export function useDisplaysPage({
  initialBootstrap,
}: UseDisplaysPageOptions = {}): UseDisplaysPageResult {
  const canReadDisplays = useCan("displays:read");
  const hasCreatePermission = useCan("displays:create");
  const hasUpdatePermission = useCan("displays:update");
  const hasDeletePermission = useCan("displays:delete");
  const authSnapshot = useSyncExternalStore(
    subscribeToAuthState,
    getAuthSnapshot,
    getAuthSnapshot,
  );
  const isAdmin = authSnapshot.user?.isAdmin === true;
  const canCreateDisplay = hasCreatePermission;
  const canManageDisplayGroups = hasUpdatePermission;
  const canUpdateDisplay = isAdmin && hasUpdatePermission;
  const canDeleteDisplay = isAdmin && hasDeletePermission;

  const filters = useDisplayFilters();
  const dialogState = useDisplayDialogState();
  const debouncedSearch = useDebounce(filters.search, 500);
  const normalizedOutputFilter = filters.normalizedOutputFilter;
  const handleOutputFilterChange = filters.handleOutputFilterChange;
  const effectiveOutputFilter: DisplayOutputFilter = canCreateDisplay
    ? normalizedOutputFilter
    : "all";
  const currentQueryArgs = UNFILTERED_DISPLAY_QUERY;
  const isInitialBootstrapQuery =
    initialBootstrap != null &&
    normalizedQueryKey(initialBootstrap.queryArgs) ===
      normalizedQueryKey(currentQueryArgs);
  const shouldSkipInitialQuery =
    isInitialBootstrapQuery && !initialBootstrap?.isSeeded;
  const [triggerDisplaysQuery] = useLazyGetDisplaysQuery();
  const [triggerBootstrapQuery] = useLazyGetDisplaysBootstrapQuery();
  const [remainingDisplayRowsState, setRemainingDisplayRowsState] =
    useState<RemainingDisplayRowsState>({ key: "", rows: [] });

  const {
    data: queriedBootstrapData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isError,
    error,
    refetch,
  } = useGetDisplaysBootstrapQuery(currentQueryArgs, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: shouldSkipInitialQuery,
  });
  const cachedInitialBootstrap =
    displaysApi.endpoints.getDisplaysBootstrap.useQueryState(currentQueryArgs, {
      skip: !isInitialBootstrapQuery,
    });
  const bootstrapData =
    queriedBootstrapData ??
    cachedInitialBootstrap.data ??
    (isInitialBootstrapQuery ? initialBootstrap?.data : undefined);
  const isLoading =
    bootstrapData == null &&
    (isInitialBootstrapQuery
      ? cachedInitialBootstrap.isLoading
      : queryIsLoading);
  const isFetching = isInitialBootstrapQuery
    ? cachedInitialBootstrap.isFetching
    : queryIsFetching;
  const handleRefetch = useCallback(() => {
    if (isInitialBootstrapQuery) {
      void triggerBootstrapQuery(currentQueryArgs, false);
      return;
    }

    refetch();
  }, [
    currentQueryArgs,
    isInitialBootstrapQuery,
    refetch,
    triggerBootstrapQuery,
  ]);

  const displaysData = bootstrapData?.displays;
  const remainingRowsKey = useMemo(() => {
    const total = displaysData?.total ?? 0;
    const firstPageIds = (displaysData?.items ?? [])
      .map((display) => display.id)
      .join("\u0000");
    return `${total}:${firstPageIds}`;
  }, [displaysData?.items, displaysData?.total]);
  const displayGroupsData = useMemo(
    () => bootstrapData?.displayGroups ?? [],
    [bootstrapData?.displayGroups],
  );
  const displayOutputOptions = bootstrapData?.displayOutputOptions ?? [];
  const runtimeOverrides = bootstrapData?.runtimeOverrides;
  const globalEmergencyActive =
    runtimeOverrides?.globalEmergency.active ?? false;

  const loadErrorMessage = getApiErrorMessage(
    error,
    "Failed to load displays. Check your connection and permissions.",
  );

  const crudHandlers = useDisplayCrudHandlers({ displayGroupsData });

  // SSE-driven cache invalidation is handled by AdminEventProvider in the
  // layout, which invalidates the Display LIST tag. RTK Query automatically
  // refetches this component's query when the tag is invalidated.

  useEffect(() => {
    if (!canCreateDisplay && normalizedOutputFilter !== "all") {
      handleOutputFilterChange("all");
    }
  }, [canCreateDisplay, handleOutputFilterChange, normalizedOutputFilter]);

  useEffect(() => {
    const totalDisplays = displaysData?.total ?? 0;
    const totalPages = Math.ceil(totalDisplays / BOOTSTRAP_PAGE_SIZE);

    if (totalPages <= 1) {
      return;
    }

    let cancelled = false;

    const remainingPageNumbers = Array.from(
      { length: totalPages - 1 },
      (_, index) => index + 2,
    );

    void Promise.all(
      remainingPageNumbers.map((page) =>
        triggerDisplaysQuery(
          {
            page,
            pageSize: BOOTSTRAP_PAGE_SIZE,
            sortBy: "name",
            sortDirection: "asc",
          },
          true,
        ).unwrap(),
      ),
    )
      .then((responses) => {
        if (cancelled) return;
        setRemainingDisplayRowsState({
          key: remainingRowsKey,
          rows: responses.flatMap((response) => response.items),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRemainingDisplayRowsState({ key: remainingRowsKey, rows: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displaysData?.total, remainingRowsKey, triggerDisplaysQuery]);

  const totalUnfilteredDisplays = displaysData?.total ?? 0;
  const needsRemainingDisplayPages =
    Math.ceil(totalUnfilteredDisplays / BOOTSTRAP_PAGE_SIZE) > 1;
  const remainingDisplayRows = useMemo(
    () =>
      remainingDisplayRowsState.key === remainingRowsKey
        ? remainingDisplayRowsState.rows
        : [],
    [remainingDisplayRowsState, remainingRowsKey],
  );
  const isLoadingRemainingDisplays =
    needsRemainingDisplayPages &&
    remainingDisplayRowsState.key !== remainingRowsKey;

  const allBackendDisplayRows = useMemo(() => {
    const rowsById = new Map<string, BackendDisplay>();
    for (const row of [
      ...(displaysData?.items ?? []),
      ...remainingDisplayRows,
    ]) {
      rowsById.set(row.id, row);
    }
    return [...rowsById.values()];
  }, [displaysData?.items, remainingDisplayRows]);

  const allDisplayRows = useMemo(() => {
    const groupsByDisplayId = new Map<string, Array<{ name: string }>>();

    for (const group of displayGroupsData) {
      const displayGroup = { name: group.name };
      for (const displayId of group.displayIds) {
        const existingGroups = groupsByDisplayId.get(displayId) ?? [];
        existingGroups.push(displayGroup);
        groupsByDisplayId.set(displayId, existingGroups);
      }
    }

    return allBackendDisplayRows.map((backendDisplay) => ({
      backendDisplay,
      display: withDisplayGroups(
        mapDisplayApiToDisplay(backendDisplay),
        groupsByDisplayId.get(backendDisplay.id) ?? [],
      ),
    }));
  }, [allBackendDisplayRows, displayGroupsData]);

  const filteredDisplayRows = useMemo(
    () =>
      allDisplayRows.filter(({ display }) => {
        if (!displayMatchesSearch(display, debouncedSearch)) return false;
        if (
          filters.statusFilter !== "all" &&
          display.status !== filters.statusFilter
        ) {
          return false;
        }
        if (!displayMatchesGroups(display, filters.groupFilters)) return false;
        return displayMatchesOutput(display, effectiveOutputFilter);
      }),
    [
      allDisplayRows,
      debouncedSearch,
      effectiveOutputFilter,
      filters.groupFilters,
      filters.statusFilter,
    ],
  );

  const filteredTotal = filteredDisplayRows.length;
  const filteredTotalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const boundedPage = Math.min(Math.max(filters.page, 1), filteredTotalPages);
  const paginatedDisplayRows = useMemo(() => {
    const start = (boundedPage - 1) * PAGE_SIZE;
    return filteredDisplayRows.slice(start, start + PAGE_SIZE);
  }, [boundedPage, filteredDisplayRows]);

  const displays: Display[] = useMemo(
    () => paginatedDisplayRows.map((row) => row.display),
    [paginatedDisplayRows],
  );

  const clientDisplaysData = useMemo<DisplaysListResponse | undefined>(() => {
    if (bootstrapData == null) return undefined;
    return {
      items: paginatedDisplayRows.map((row) => row.backendDisplay),
      total: filteredTotal,
      page: boundedPage,
      pageSize: PAGE_SIZE,
    };
  }, [bootstrapData, boundedPage, filteredTotal, paginatedDisplayRows]);

  const availableGroupFilters = useMemo(
    () => dedupeDisplayGroupNames(displayGroupsData.map((g) => g.name)),
    [displayGroupsData],
  );

  const availableOutputFilters = canCreateDisplay ? displayOutputOptions : [];

  const { handleConfirmUnregisterDisplay: confirmUnregister } = crudHandlers;

  const handleConfirmUnregisterDisplay = useCallback(
    () => confirmUnregister(dialogState.displayToUnregister),
    [confirmUnregister, dialogState.displayToUnregister],
  );

  return {
    canReadDisplays,
    canCreateDisplay,
    canManageDisplayGroups,
    canUpdateDisplay,
    canDeleteDisplay,
    statusFilter: filters.statusFilter,
    search: filters.search,
    page: filters.page,
    groupFilters: filters.groupFilters,
    normalizedOutputFilter: effectiveOutputFilter,
    availableGroupFilters,
    availableOutputFilters,
    displays,
    displaysData: clientDisplaysData,
    displayGroupsData,
    globalEmergencyActive,
    isLoading,
    isFetching: isFetching || isLoadingRemainingDisplays,
    isError,
    loadErrorMessage,
    isAddInfoDialogOpen: dialogState.isAddInfoDialogOpen,
    isEditDialogOpen: dialogState.isEditDialogOpen,
    isUnregisterDialogOpen: dialogState.isUnregisterDialogOpen,
    selectedDisplay: dialogState.selectedDisplay,
    displayToUnregister: dialogState.displayToUnregister,
    setIsAddInfoDialogOpen: dialogState.setIsAddInfoDialogOpen,
    setPage: filters.setPage,
    refetch: handleRefetch,
    handleStatusFilterChange: filters.handleStatusFilterChange,
    handleSearchChange: filters.handleSearchChange,
    handleGroupFilterChange: filters.handleGroupFilterChange,
    handleOutputFilterChange: filters.handleOutputFilterChange,
    handleClearFilters: filters.handleClearFilters,
    handleViewPage: dialogState.handleViewPage,
    handleUnregisterDisplay: dialogState.handleUnregisterDisplay,
    handleUnregisterDialogOpenChange:
      dialogState.handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay,
    unregisterDisplayById: crudHandlers.unregisterDisplayById,
    handleEditDisplay: dialogState.handleEditDisplay,
    handleSaveDisplay: crudHandlers.handleSaveDisplay,
    handleEditDialogOpenChange: dialogState.handleEditDialogOpenChange,
  };
}
