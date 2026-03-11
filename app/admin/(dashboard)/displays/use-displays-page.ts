"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryListState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  useGetRuntimeOverridesQuery,
  useLazyGetDisplayQuery,
  useCreateDisplayGroupMutation,
  useGetDisplayOutputOptionsQuery,
  useGetDisplayGroupsQuery,
  useGetDisplaysQuery,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
import { subscribeToDisplayLifecycleEvents } from "@/lib/api/display-events";
import { useListContentQuery } from "@/lib/api/content-api";
import { getNextDisplayGroupColorIndex } from "@/lib/display-group-colors";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/map-display-to-display";
import type { DisplayStatusFilter } from "@/components/displays/display-filter-popover";
import type {
  Display,
  DisplayOutputFilter,
} from "@/types/display";
import type {
  DisplayGroup,
  DisplaysListResponse,
} from "@/lib/api/displays-api";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
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

  const [statusFilter, setStatusFilter] =
    useQueryEnumState<DisplayStatusFilter>(
      "status",
      "all",
      DISPLAY_STATUS_VALUES,
    );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);
  const [groupFilters, setGroupFilters] = useQueryListState("groups", []);
  const [outputFilter, setOutputFilter] = useQueryStringState("output", "all");
  const deferredSearch = useDeferredValue(search);

  const { data: displayGroupsData = [] } = useGetDisplayGroupsQuery();
  const { data: displayOutputOptions = [] } = useGetDisplayOutputOptionsQuery();

  const selectedGroupIds = useMemo(
    () =>
      displayGroupsData
        .filter((group) => groupFilters.includes(group.name))
        .map((group) => group.id),
    [displayGroupsData, groupFilters],
  );

  const normalizedOutputFilter: DisplayOutputFilter =
    outputFilter.length > 0 ? outputFilter : "all";

  const {
    data: displaysData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDisplaysQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      q: deferredSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      output:
        normalizedOutputFilter === "all" ? undefined : normalizedOutputFilter,
      sortBy: "name",
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

  const [isAddInfoDialogOpen, setIsAddInfoDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isUnregisterDialogOpen, setIsUnregisterDialogOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);
  const [displayToUnregister, setDisplayToUnregister] =
    useState<Display | null>(null);

  const [updateDisplay] = useUpdateDisplayMutation();
  const [setDisplayGroups] = useSetDisplayGroupsMutation();
  const [createDisplayGroup] = useCreateDisplayGroupMutation();
  const [unregisterDisplay] = useUnregisterDisplayMutation();
  const [getDisplayById] = useLazyGetDisplayQuery();

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

  const availableOutputFilters = displayOutputOptions;

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

  const handleStatusFilterChange = useCallback(
    (value: DisplayStatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleGroupFilterChange = useCallback(
    (value: readonly string[]) => {
      setGroupFilters(value);
      setPage(1);
    },
    [setGroupFilters, setPage],
  );

  const handleOutputFilterChange = useCallback(
    (value: DisplayOutputFilter) => {
      setOutputFilter(value);
      setPage(1);
    },
    [setOutputFilter, setPage],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setGroupFilters([]);
    setOutputFilter("all");
    setPage(1);
  }, [setStatusFilter, setGroupFilters, setOutputFilter, setPage]);

  const refreshSelectedDisplay = useCallback(
    async (display: Display): Promise<void> => {
      try {
        const freshDisplay = await getDisplayById(display.id, true).unwrap();
        setSelectedDisplay(
          withDisplayGroups(mapDisplayApiToDisplay(freshDisplay), [
            ...display.groups,
          ]),
        );
      } catch {
        // Keep current row data when hydration fails.
      }
    },
    [getDisplayById],
  );

  const handleViewDetails = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsViewDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleViewPage = useCallback((display: Display) => {
    const slug = display.slug.trim();
    if (!slug) {
      toast.error(
        "Display page is unavailable because display slug is missing.",
      );
      return;
    }
    window.open(
      `/displays/${encodeURIComponent(slug)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handleUnregisterDisplay = useCallback((display: Display) => {
    setDisplayToUnregister(display);
    setIsUnregisterDialogOpen(true);
  }, []);

  const handleUnregisterDialogOpenChange = useCallback((open: boolean) => {
    setIsUnregisterDialogOpen(open);
    if (!open) {
      setDisplayToUnregister(null);
    }
  }, []);

  const handleConfirmUnregisterDisplay = useCallback(async () => {
    if (!displayToUnregister) {
      return;
    }
    await unregisterDisplay({ displayId: displayToUnregister.id }).unwrap();
    toast.success(`"${displayToUnregister.name}" was unregistered.`);
  }, [displayToUnregister, unregisterDisplay]);

  const handleEditDisplay = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsEditDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleEditFromView = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsViewDialogOpen(false);
      setIsEditDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleSaveDisplay = useCallback(
    async (display: Display): Promise<boolean> => {
      const [screenWidthRaw, screenHeightRaw] = display.resolution.split("x");
      const screenWidth =
        screenWidthRaw && Number.isFinite(Number(screenWidthRaw))
          ? Number(screenWidthRaw)
          : null;
      const screenHeight =
        screenHeightRaw && Number.isFinite(Number(screenHeightRaw))
          ? Number(screenHeightRaw)
          : null;

      try {
        await updateDisplay({
          id: display.id,
          name: display.name,
          location: display.location,
          ipAddress: display.ipAddress === "" ? null : display.ipAddress,
          macAddress: display.macAddress === "" ? null : display.macAddress,
          output: display.output === "Not available" ? null : display.output,
          emergencyContentId: display.emergencyContentId,
          screenWidth,
          screenHeight,
        }).unwrap();
      } catch (updateError) {
        notifyApiError(updateError, "Failed to save display details.");
        return false;
      }

      try {
        const workingGroups = [...displayGroupsData];
        let nextColorIndex = getNextDisplayGroupColorIndex(workingGroups);
        const existingByKey = new Map<string, string>();
        for (const group of workingGroups) {
          const groupKey = toDisplayGroupKey(group.name);
          if (!existingByKey.has(groupKey)) {
            existingByKey.set(groupKey, group.id);
          }
        }

        const selectedGroupNames = dedupeDisplayGroupNames(
          display.groups.map((group) => group.name),
        );
        const nextGroupIds = new Set<string>();
        for (const groupName of selectedGroupNames) {
          const normalizedName = collapseDisplayGroupWhitespace(groupName);
          if (normalizedName.length === 0) continue;

          const groupKey = toDisplayGroupKey(normalizedName);
          const existingId = existingByKey.get(groupKey);
          if (existingId) {
            nextGroupIds.add(existingId);
            continue;
          }

          const created = await createDisplayGroup({
            name: normalizedName,
            colorIndex: nextColorIndex,
          }).unwrap();
          const createdKey = toDisplayGroupKey(created.name);
          existingByKey.set(createdKey, created.id);
          nextGroupIds.add(created.id);
          workingGroups.push(created);
          nextColorIndex = getNextDisplayGroupColorIndex(workingGroups);
        }

        await setDisplayGroups({
          displayId: display.id,
          groupIds: [...nextGroupIds],
        }).unwrap();
      } catch (groupsError) {
        notifyApiError(
          groupsError,
          "Display details were saved, but display-group assignment failed.",
        );
        return false;
      }

      toast.success(`Updated "${display.name}".`);
      return true;
    },
    [updateDisplay, displayGroupsData, createDisplayGroup, setDisplayGroups],
  );

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedDisplay(null);
    }
  }, []);

  return {
    canReadDisplays,
    canUpdateDisplay,
    canDeleteDisplay,
    statusFilter,
    search,
    page,
    groupFilters,
    normalizedOutputFilter,
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
    isAddInfoDialogOpen,
    isViewDialogOpen,
    isEditDialogOpen,
    isGroupManagerOpen,
    isUnregisterDialogOpen,
    selectedDisplay,
    displayToUnregister,
    setIsAddInfoDialogOpen,
    setIsViewDialogOpen,
    setIsGroupManagerOpen,
    setPage,
    refetch,
    handleStatusFilterChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
    handleViewDetails,
    handleViewPage,
    handleUnregisterDisplay,
    handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay,
    handleEditDisplay,
    handleEditFromView,
    handleSaveDisplay,
    handleEditDialogOpenChange,
  };
}
