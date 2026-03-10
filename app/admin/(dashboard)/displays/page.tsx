"use client";

import type { ReactElement } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Pagination } from "@/components/content/pagination";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";
import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { DisplayStatusFilter } from "@/components/displays/display-status-tabs";
import type {
  Display,
  DisplayOutputFilter,
  DisplaySortField,
} from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
const DISPLAY_SORT_VALUES = ["alphabetical", "status", "location"] as const;
const PAGE_SIZE = 20;

export default function DisplaysPage(): ReactElement {
  const canReadDisplays = useCan("displays:read");
  const canUpdateDisplay = useCan("displays:update");
  const canDeleteDisplay = useCan("displays:delete");
  const [statusFilter, setStatusFilter] =
    useQueryEnumState<DisplayStatusFilter>(
      "status",
      "all",
      DISPLAY_STATUS_VALUES,
    );
  const [sortBy, setSortBy] = useQueryEnumState<DisplaySortField>(
    "sort",
    "alphabetical",
    DISPLAY_SORT_VALUES,
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
      sortBy:
        sortBy === "alphabetical"
          ? "name"
          : sortBy === "location"
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

  const handleSortChange = useCallback(
    (value: DisplaySortField) => {
      setSortBy(value);
      setPage(1);
    },
    [setSortBy, setPage],
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
    setGroupFilters([]);
    setOutputFilter("all");
    setPage(1);
  }, [setGroupFilters, setOutputFilter, setPage]);

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
  const paginatedDisplays = displays;

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Displays"
        actions={
          <>
            <Can permission="displays:create">
              <Button onClick={() => setIsAddInfoDialogOpen(true)}>
                <IconPlus className="size-4" aria-hidden="true" />
                Add Display
              </Button>
            </Can>
            <Can permission="displays:update">
              <Button
                variant="outline"
                onClick={() => setIsGroupManagerOpen(true)}
                className="gap-2"
              >
                <IconSettings className="size-4" aria-hidden="true" />
                Add Display Group
              </Button>
            </Can>
          </>
        }
      />

      {isError ? (
        <DashboardPage.Banner tone="danger">
          {loadErrorMessage}
        </DashboardPage.Banner>
      ) : null}

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <DisplaysToolbar
              statusFilter={statusFilter}
              sortBy={sortBy}
              search={search}
              selectedGroups={groupFilters}
              selectedOutput={normalizedOutputFilter}
              availableGroups={availableGroupFilters}
              availableOutputs={availableOutputFilters}
              onStatusFilterChange={handleStatusFilterChange}
              onSortChange={handleSortChange}
              onSearchChange={handleSearchChange}
              onGroupFilterChange={handleGroupFilterChange}
              onOutputFilterChange={handleOutputFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[220px] rounded-md" />
                ))}
              </div>
            ) : (
              <DisplayGrid
                items={paginatedDisplays}
                onViewDetails={handleViewDetails}
                onViewPage={handleViewPage}
                onUnregisterDisplay={
                  canDeleteDisplay ? handleUnregisterDisplay : undefined
                }
                onEditDisplay={canUpdateDisplay ? handleEditDisplay : undefined}
                isGlobalEmergencyActive={globalEmergencyActive}
              />
            )}
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={displaysData?.total ?? 0}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <DisplayRegistrationInfoDialog
        open={isAddInfoDialogOpen}
        onOpenChange={setIsAddInfoDialogOpen}
        onRegistrationSucceeded={refetch}
      />

      <ViewDisplayDialog
        display={selectedDisplay}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        canEdit={canUpdateDisplay}
      />

      <EditDisplayDialog
        display={selectedDisplay}
        existingGroups={displayGroupsData}
        emergencyContentOptions={emergencyContentOptions}
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        onSave={handleSaveDisplay}
        canManageGroups={canUpdateDisplay}
      />

      <DisplayGroupManagerDialog
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        groups={displayGroupsData}
      />

      <ConfirmActionDialog
        open={isUnregisterDialogOpen}
        onOpenChange={handleUnregisterDialogOpenChange}
        title="Unregister display?"
        description={
          displayToUnregister
            ? `This will disconnect \"${displayToUnregister.name}\" and revoke its runtime authentication key.`
            : "This will disconnect the display and revoke its runtime authentication key."
        }
        confirmLabel="Unregister Display"
        errorFallback="Failed to unregister display."
        onConfirm={handleConfirmUnregisterDisplay}
      />
    </DashboardPage.Root>
  );
}
