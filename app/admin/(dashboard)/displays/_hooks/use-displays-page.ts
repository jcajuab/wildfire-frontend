"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useGetRuntimeOverridesQuery,
  useGetDisplayOutputOptionsQuery,
  useGetDisplayGroupsQuery,
  useGetDisplaysQuery,
} from "@/lib/api/displays-api";
import { subscribeToDisplayLifecycleEvents } from "@/lib/api/display-events";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import { dedupeDisplayGroupNames } from "@/lib/display-group-normalization";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type { Display, DisplayOutputFilter } from "@/types/display";
import type {
  DisplayGroup,
  DisplaysListResponse,
} from "@/lib/api/displays-api";
import { useDisplayFilters } from "./use-display-filters";
import { useDisplayDialogState } from "./use-display-dialog-state";
import { useDisplayCrudHandlers } from "./use-display-crud-handlers";

export const PAGE_SIZE = 20;

export interface UseDisplaysPageResult {
  // Permissions
  canReadDisplays: boolean;
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
  isError: boolean;
  loadErrorMessage: string;

  // Dialog state
  isAddInfoDialogOpen: boolean;
  isViewDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isGroupManagerOpen: boolean;
  isUnregisterDialogOpen: boolean;
  selectedDisplay: Display | null;
  displayToUnregister: Display | null;

  // Dialog setters
  setIsAddInfoDialogOpen: (open: boolean) => void;
  setIsViewDialogOpen: (open: boolean) => void;
  setIsGroupManagerOpen: (open: boolean) => void;
  setPage: (page: number) => void;

  // Handlers
  refetch: () => void;
  handleStatusFilterChange: (value: DisplayStatusFilter) => void;
  handleSearchChange: (value: string) => void;
  handleGroupFilterChange: (value: readonly string[]) => void;
  handleOutputFilterChange: (value: DisplayOutputFilter) => void;
  handleClearFilters: () => void;
  handleViewDetails: (display: Display) => void;
  handleViewPage: (display: Display) => void;
  handleUnregisterDisplay: (display: Display) => void;
  handleUnregisterDialogOpenChange: (open: boolean) => void;
  handleConfirmUnregisterDisplay: () => Promise<void>;
  handleEditDisplay: (display: Display) => void;
  handleEditFromView: (display: Display) => void;
  handleSaveDisplay: (display: Display) => Promise<boolean>;
  handleEditDialogOpenChange: (open: boolean) => void;
}

export function useDisplaysPage(): UseDisplaysPageResult {
  const canReadDisplays = useCan("displays:read");
  const canUpdateDisplay = useCan("displays:update");
  const canDeleteDisplay = useCan("displays:delete");

  const filters = useDisplayFilters();
  const dialogState = useDisplayDialogState();

  const { data: displayGroupsData = [] } = useGetDisplayGroupsQuery();
  const { data: displayOutputOptions = [] } = useGetDisplayOutputOptionsQuery();

  const selectedGroupIds = useMemo(
    () =>
      displayGroupsData
        .filter((group) => filters.groupFilters.includes(group.name))
        .map((group) => group.id),
    [displayGroupsData, filters.groupFilters],
  );

  const {
    data: displaysData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDisplaysQuery(
    {
      page: filters.page,
      pageSize: PAGE_SIZE,
      q: filters.deferredSearch || undefined,
      status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      output:
        filters.normalizedOutputFilter === "all"
          ? undefined
          : filters.normalizedOutputFilter,
      sortBy: "name",
      sortDirection: "asc",
    },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const { data: runtimeOverrides } = useGetRuntimeOverridesQuery(undefined, {
    skip: !canReadDisplays,
  });
  const globalEmergencyActive =
    runtimeOverrides?.globalEmergency.active ?? false;

  const { data: emergencyAssets } = useGetContentOptionsQuery(
    { status: "READY" },
    { skip: !canUpdateDisplay },
  );

  const loadErrorMessage = getApiErrorMessage(
    error,
    "Failed to load displays. Check your connection and permissions.",
  );

  const crudHandlers = useDisplayCrudHandlers({ displayGroupsData });

  useEffect(() => {
    if (!canReadDisplays) return;
    const subscription = subscribeToDisplayLifecycleEvents({
      onEvent: () => {
        void refetch();
      },
    });

    return () => {
      subscription.close();
    };
  }, [canReadDisplays, refetch]);

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
    isError,
    loadErrorMessage,
    isAddInfoDialogOpen: dialogState.isAddInfoDialogOpen,
    isViewDialogOpen: dialogState.isViewDialogOpen,
    isEditDialogOpen: dialogState.isEditDialogOpen,
    isGroupManagerOpen: dialogState.isGroupManagerOpen,
    isUnregisterDialogOpen: dialogState.isUnregisterDialogOpen,
    selectedDisplay: dialogState.selectedDisplay,
    displayToUnregister: dialogState.displayToUnregister,
    setIsAddInfoDialogOpen: dialogState.setIsAddInfoDialogOpen,
    setIsViewDialogOpen: dialogState.setIsViewDialogOpen,
    setIsGroupManagerOpen: dialogState.setIsGroupManagerOpen,
    setPage: filters.setPage,
    refetch,
    handleStatusFilterChange: filters.handleStatusFilterChange,
    handleSearchChange: filters.handleSearchChange,
    handleGroupFilterChange: filters.handleGroupFilterChange,
    handleOutputFilterChange: filters.handleOutputFilterChange,
    handleClearFilters: filters.handleClearFilters,
    handleViewDetails: dialogState.handleViewDetails,
    handleViewPage: dialogState.handleViewPage,
    handleUnregisterDisplay: dialogState.handleUnregisterDisplay,
    handleUnregisterDialogOpenChange:
      dialogState.handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay,
    handleEditDisplay: dialogState.handleEditDisplay,
    handleEditFromView: dialogState.handleEditFromView,
    handleSaveDisplay: crudHandlers.handleSaveDisplay,
    handleEditDialogOpenChange: dialogState.handleEditDialogOpenChange,
  };
}
