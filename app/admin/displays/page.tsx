"use client";

import type { ReactElement } from "react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { Pagination } from "@/components/content/pagination";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";
import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { PreviewDisplayDialog } from "@/components/displays/preview-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryListState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useCreateDisplayGroupMutation,
  useGetDisplayGroupsQuery,
  useGetDisplaysQuery,
  useRequestDisplayRefreshMutation,
  useSetDisplayGroupsMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
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
  const canUpdateDisplay = useCan("displays:update");
  const {
    data: displaysData,
    isLoading,
    isError,
    error,
  } = useGetDisplaysQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: displayGroupsData } = useGetDisplayGroupsQuery();
  const loadErrorMessage = getApiErrorMessage(
    error,
    "Failed to load displays. Check your connection and permissions.",
  );

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

  const [isAddInfoDialogOpen, setIsAddInfoDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);
  const [updateDisplay] = useUpdateDisplayMutation();
  const [setDisplayGroups] = useSetDisplayGroupsMutation();
  const [createDisplayGroup] = useCreateDisplayGroupMutation();
  const [requestDisplayRefresh] = useRequestDisplayRefreshMutation();
  const deferredSearch = useDeferredValue(search);

  const displays: Display[] = useMemo(() => {
    const groupsByDisplayId = new Map<
      string,
      Array<{ name: string; colorIndex: number }>
    >();

    for (const group of displayGroupsData?.items ?? []) {
      const displayGroup = {
        name: group.name,
        colorIndex: group.colorIndex ?? 0,
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
  }, [displaysData?.items, displayGroupsData?.items]);

  const normalizedOutputFilter: DisplayOutputFilter =
    outputFilter.length > 0 ? outputFilter : "all";

  const availableGroupFilters = useMemo(
    () =>
      dedupeDisplayGroupNames(
        (displayGroupsData?.items ?? []).map((g) => g.name),
      ),
    [displayGroupsData?.items],
  );

  const availableOutputFilters = useMemo(() => {
    const outputNames = new Set<string>();
    for (const display of displays) {
      const outputName = display.displayOutput.trim();
      if (outputName.length === 0) continue;
      outputNames.add(outputName);
    }
    return [...outputNames].sort((left, right) => left.localeCompare(right));
  }, [displays]);

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

  const handleViewDetails = useCallback((display: Display) => {
    setSelectedDisplay(display);
    setIsViewDialogOpen(true);
  }, []);

  const handlePreviewPage = useCallback((display: Display) => {
    setSelectedDisplay(display);
    setIsPreviewDialogOpen(true);
  }, []);

  const handleRefreshPage = useCallback(
    async (display: Display) => {
      try {
        await requestDisplayRefresh({ displayId: display.id }).unwrap();
        toast.success(
          `"${display.name}" will refresh on its next display poll.`,
        );
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, "Failed to queue display refresh."),
        );
      }
    },
    [requestDisplayRefresh],
  );

  const handleEditDisplay = useCallback((display: Display) => {
    setSelectedDisplay(display);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditFromView = useCallback((display: Display) => {
    setSelectedDisplay(display);
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  }, []);

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
          outputType:
            display.displayOutput === "Not available"
              ? null
              : display.displayOutput,
          screenWidth,
          screenHeight,
        }).unwrap();
      } catch (updateError) {
        toast.error(
          `Failed to save display details: ${getApiErrorMessage(
            updateError,
            "Group assignments were not changed.",
          )}`,
        );
        return false;
      }

      try {
        const workingGroups = [...(displayGroupsData?.items ?? [])];
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
        toast.error(
          `Display details were saved, but display-group assignment failed: ${getApiErrorMessage(
            groupsError,
            "Display details were saved, but display-group assignment failed.",
          )}`,
        );
        return false;
      }

      toast.success(`Updated "${display.name}".`);
      return true;
    },
    [updateDisplay, displayGroupsData, createDisplayGroup, setDisplayGroups],
  );

  const groupFilterKeys = useMemo(
    () =>
      new Set(groupFilters.map((groupName) => toDisplayGroupKey(groupName))),
    [groupFilters],
  );

  const filteredDisplays = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return displays.filter((display) => {
      if (statusFilter !== "all" && display.status !== statusFilter) {
        return false;
      }

      if (normalizedSearch.length > 0) {
        const matchesName = display.name
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesLocation = display.location
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesIdentifier = display.identifier
          ?.toLowerCase()
          .includes(normalizedSearch);
        if (!matchesName && !matchesLocation && !matchesIdentifier) {
          return false;
        }
      }

      if (groupFilterKeys.size > 0) {
        const hasMatchingGroup = display.groups.some((group) =>
          groupFilterKeys.has(toDisplayGroupKey(group.name)),
        );
        if (!hasMatchingGroup) {
          return false;
        }
      }

      if (
        normalizedOutputFilter !== "all" &&
        display.displayOutput !== normalizedOutputFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    displays,
    statusFilter,
    deferredSearch,
    groupFilterKeys,
    normalizedOutputFilter,
  ]);

  const sortedDisplays = useMemo(
    () =>
      [...filteredDisplays].sort((leftDisplay, rightDisplay) => {
        switch (sortBy) {
          case "alphabetical":
            return leftDisplay.name.localeCompare(rightDisplay.name);
          case "status":
            return leftDisplay.status.localeCompare(rightDisplay.status);
          case "location":
            return leftDisplay.location.localeCompare(rightDisplay.location);
          default:
            return 0;
        }
      }),
    [filteredDisplays, sortBy],
  );

  const paginatedDisplays = useMemo(
    () => sortedDisplays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedDisplays, page],
  );

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
        <DashboardPage.Toolbar>
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
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-5">
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
              onPreviewPage={handlePreviewPage}
              onRefreshPage={canUpdateDisplay ? handleRefreshPage : undefined}
              onEditDisplay={canUpdateDisplay ? handleEditDisplay : undefined}
            />
          )}
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={sortedDisplays.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <DisplayRegistrationInfoDialog
        open={isAddInfoDialogOpen}
        onOpenChange={setIsAddInfoDialogOpen}
      />

      <ViewDisplayDialog
        display={selectedDisplay}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        canEdit={canUpdateDisplay}
      />

      <PreviewDisplayDialog
        display={selectedDisplay}
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
      />

      <EditDisplayDialog
        display={selectedDisplay}
        existingGroups={displayGroupsData?.items ?? []}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveDisplay}
        canManageGroups={canUpdateDisplay}
      />

      <DisplayGroupManagerDialog
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        groups={displayGroupsData?.items ?? []}
      />
    </DashboardPage.Root>
  );
}
