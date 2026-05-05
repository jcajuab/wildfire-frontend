"use client";

import { useCallback, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeToAuthState } from "@/lib/auth-session";
import { useDebounce } from "@/hooks/use-debounce";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  displaysApi,
  useGetDisplaysBootstrapQuery,
  useLazyGetDisplaysBootstrapQuery,
} from "@/lib/api/displays-api";

import { dedupeDisplayGroupNames } from "@/lib/display-group-normalization";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type { Display, DisplayOutputFilter } from "@/types/display";
import type {
  DisplaysBootstrapResponse,
  DisplayGroup,
  DisplaysListQuery,
  DisplaysListResponse,
} from "@/lib/api/displays-api";
import { useDisplayFilters } from "./use-display-filters";
import { useDisplayDialogState } from "./use-display-dialog-state";
import { DISPLAYS_PAGE_SIZE } from "@/lib/displays-search-params";
import { useDisplayCrudHandlers } from "./use-display-crud-handlers";

export const PAGE_SIZE = DISPLAYS_PAGE_SIZE;

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
  emergencyContentOptions: readonly { id: string; title: string }[];
  globalEmergencyActive: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  loadErrorMessage: string;

  // Dialog state
  isAddInfoDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isGroupManagerOpen: boolean;
  isUnregisterDialogOpen: boolean;
  selectedDisplay: Display | null;
  displayToUnregister: Display | null;

  // Dialog setters
  setIsAddInfoDialogOpen: (open: boolean) => void;
  setIsGroupManagerOpen: (open: boolean) => void;
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
  const currentQueryArgs = useMemo<DisplaysListQuery>(
    () => ({
      page: filters.page,
      pageSize: PAGE_SIZE,
      q: debouncedSearch || undefined,
      status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
      groupNames:
        filters.groupFilters.length > 0 ? filters.groupFilters : undefined,
      output:
        filters.normalizedOutputFilter === "all"
          ? undefined
          : filters.normalizedOutputFilter,
      sortBy: "name",
      sortDirection: "asc",
    }),
    [
      debouncedSearch,
      filters.groupFilters,
      filters.normalizedOutputFilter,
      filters.page,
      filters.statusFilter,
    ],
  );
  const isInitialBootstrapQuery =
    initialBootstrap != null &&
    normalizedQueryKey(initialBootstrap.queryArgs) ===
      normalizedQueryKey(currentQueryArgs);
  const shouldSkipInitialQuery = isInitialBootstrapQuery;
  const [triggerBootstrapQuery] = useLazyGetDisplaysBootstrapQuery();

  const {
    data: queriedBootstrapData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isError,
    error,
    refetch,
  } = useGetDisplaysBootstrapQuery(
    currentQueryArgs,
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: shouldSkipInitialQuery,
    },
  );
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
  const displayGroupsData = useMemo(
    () => bootstrapData?.displayGroups ?? [],
    [bootstrapData?.displayGroups],
  );
  const displayOutputOptions = bootstrapData?.displayOutputOptions ?? [];
  const runtimeOverrides = bootstrapData?.runtimeOverrides;
  const globalEmergencyActive =
    runtimeOverrides?.globalEmergency.active ?? false;
  const emergencyAssets = useMemo(
    () => bootstrapData?.emergencyContentOptions ?? [],
    [bootstrapData?.emergencyContentOptions],
  );

  const loadErrorMessage = getApiErrorMessage(
    error,
    "Failed to load displays. Check your connection and permissions.",
  );

  const crudHandlers = useDisplayCrudHandlers({ displayGroupsData });

  // SSE-driven cache invalidation is handled by AdminEventProvider in the
  // layout, which invalidates the Display LIST tag. RTK Query automatically
  // refetches this component's query when the tag is invalidated.

  const displays: Display[] = useMemo(() => {
    const groupsByDisplayId = new Map<string, Array<{ name: string }>>();

    for (const group of displayGroupsData) {
      const displayGroup = { name: group.name };
      for (const displayId of group.displayIds) {
        const existingGroups = groupsByDisplayId.get(displayId) ?? [];
        existingGroups.push(displayGroup);
        groupsByDisplayId.set(displayId, existingGroups);
      }
    }

    return (displaysData?.items ?? []).map((display) =>
      withDisplayGroups(
        mapDisplayApiToDisplay(display),
        groupsByDisplayId.get(display.id) ?? [],
      ),
    );
  }, [displaysData?.items, displayGroupsData]);

  const availableGroupFilters = useMemo(
    () => dedupeDisplayGroupNames(displayGroupsData.map((g) => g.name)),
    [displayGroupsData],
  );

  const availableOutputFilters = displayOutputOptions;

  const emergencyContentOptions = useMemo(
    () =>
      (emergencyAssets ?? [])
        .filter(
          (asset) =>
            asset.type === "IMAGE" ||
            asset.type === "VIDEO" ||
            asset.type === "TEXT",
        )
        .map((asset) => ({
          id: asset.id,
          title: asset.title,
        })),
    [emergencyAssets],
  );

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
    normalizedOutputFilter: filters.normalizedOutputFilter,
    availableGroupFilters,
    availableOutputFilters,
    displays,
    displaysData,
    displayGroupsData,
    emergencyContentOptions,
    globalEmergencyActive,
    isLoading,
    isFetching,
    isError,
    loadErrorMessage,
    isAddInfoDialogOpen: dialogState.isAddInfoDialogOpen,
    isEditDialogOpen: dialogState.isEditDialogOpen,
    isGroupManagerOpen: dialogState.isGroupManagerOpen,
    isUnregisterDialogOpen: dialogState.isUnregisterDialogOpen,
    selectedDisplay: dialogState.selectedDisplay,
    displayToUnregister: dialogState.displayToUnregister,
    setIsAddInfoDialogOpen: dialogState.setIsAddInfoDialogOpen,
    setIsGroupManagerOpen: dialogState.setIsGroupManagerOpen,
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
