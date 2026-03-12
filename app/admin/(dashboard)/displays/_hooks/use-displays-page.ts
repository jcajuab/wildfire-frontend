"use client";

import { useEffect, useMemo } from "react";
import { useCan } from "@/hooks/use-can";
import {
  useGetDisplayGroupsQuery,
  useGetDisplayOutputOptionsQuery,
  useGetDisplaysQuery,
  useGetRuntimeOverridesQuery,
} from "@/lib/api/displays-api";
import { subscribeToDisplayLifecycleEvents } from "@/lib/api/display-events";
import { useListContentQuery } from "@/lib/api/content-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/map-display-to-display";
import { dedupeDisplayGroupNames } from "@/lib/display-group-normalization";
import type {
  Display,
  DisplayOutputFilter,
  DisplaySortField,
  DisplayStatusFilter,
} from "@/types/display";
import type {
  DisplayGroup,
  DisplaysListResponse,
} from "@/lib/api/displays-api";
import { useDisplaysFilters } from "./use-displays-filters";
import { useDisplaysDialogs } from "./use-displays-dialogs";
import { useDisplaysHandlers } from "./use-displays-handlers";

export const PAGE_SIZE = 20;

export interface UseDisplaysPageResult {
  // Permissions
  canReadDisplays: boolean;
  canUpdateDisplay: boolean;
  canDeleteDisplay: boolean;

  // Filter state
  statusFilter: DisplayStatusFilter;
  sortBy: DisplaySortField;
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
  handleSortChange: (value: DisplaySortField) => void;
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

  const filters = useDisplaysFilters();
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
      sortBy:
        filters.sortBy === "alphabetical"
          ? "name"
          : filters.sortBy === "location"
            ? "location"
            : "status",
      sortDirection: "asc",
    },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const { data: runtimeOverrides } = useGetRuntimeOverridesQuery(undefined, {
    pollingInterval: 5_000,
    skip: !canReadDisplays,
  });
  const globalEmergencyActive =
    runtimeOverrides?.globalEmergency.active ?? false;

  const { data: emergencyAssets } = useListContentQuery(
    {
      page: 1,
      pageSize: 100,
      status: "READY",
      sortBy: "createdAt",
      sortDirection: "desc",
    },
    { skip: !canUpdateDisplay },
  );

  const loadErrorMessage = getApiErrorMessage(
    error,
    "Failed to load displays. Check your connection and permissions.",
  );

  const dialogs = useDisplaysDialogs();
  const handlers = useDisplaysHandlers({
    displayGroupsData,
    displayToUnregister: dialogs.displayToUnregister,
  });

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
    const groupsByDisplayId = new Map<
      string,
      Array<{ name: string; colorIndex: number }>
    >();

    for (const group of displayGroupsData) {
      const displayGroup = {
        name: group.name,
        colorIndex: group.colorIndex,
      };
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

  const emergencyContentOptions = useMemo(
    () =>
      (emergencyAssets?.items ?? [])
        .filter(
          (asset) =>
            asset.kind === "ROOT" &&
            (asset.type === "IMAGE" ||
              asset.type === "VIDEO" ||
              asset.type === "PDF"),
        )
        .map((asset) => ({
          id: asset.id,
          title: asset.title,
        })),
    [emergencyAssets?.items],
  );

  return {
    canReadDisplays,
    canUpdateDisplay,
    canDeleteDisplay,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    search: filters.search,
    page: filters.page,
    groupFilters: filters.groupFilters,
    normalizedOutputFilter: filters.normalizedOutputFilter,
    availableGroupFilters,
    availableOutputFilters: displayOutputOptions,
    displays,
    displaysData,
    displayGroupsData,
    emergencyContentOptions,
    globalEmergencyActive,
    isLoading,
    isError,
    loadErrorMessage,
    isAddInfoDialogOpen: dialogs.isAddInfoDialogOpen,
    isViewDialogOpen: dialogs.isViewDialogOpen,
    isEditDialogOpen: dialogs.isEditDialogOpen,
    isGroupManagerOpen: dialogs.isGroupManagerOpen,
    isUnregisterDialogOpen: dialogs.isUnregisterDialogOpen,
    selectedDisplay: dialogs.selectedDisplay,
    displayToUnregister: dialogs.displayToUnregister,
    setIsAddInfoDialogOpen: dialogs.setIsAddInfoDialogOpen,
    setIsViewDialogOpen: dialogs.setIsViewDialogOpen,
    setIsGroupManagerOpen: dialogs.setIsGroupManagerOpen,
    setPage: filters.setPage,
    refetch,
    handleStatusFilterChange: filters.handleStatusFilterChange,
    handleSortChange: filters.handleSortChange,
    handleSearchChange: filters.handleSearchChange,
    handleGroupFilterChange: filters.handleGroupFilterChange,
    handleOutputFilterChange: filters.handleOutputFilterChange,
    handleClearFilters: filters.handleClearFilters,
    handleViewDetails: dialogs.handleViewDetails,
    handleViewPage: dialogs.handleViewPage,
    handleUnregisterDisplay: dialogs.handleUnregisterDisplay,
    handleUnregisterDialogOpenChange: dialogs.handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay: handlers.handleConfirmUnregisterDisplay,
    handleEditDisplay: dialogs.handleEditDisplay,
    handleEditFromView: dialogs.handleEditFromView,
    handleSaveDisplay: handlers.handleSaveDisplay,
    handleEditDialogOpenChange: dialogs.handleEditDialogOpenChange,
  };
}
