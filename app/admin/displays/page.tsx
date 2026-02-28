"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { Pagination } from "@/components/content/pagination";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaySearchInput } from "@/components/displays/display-search-input";
import { DisplaySortSelect } from "@/components/displays/display-sort-select";
import { DisplayStatusTabs } from "@/components/displays/display-status-tabs";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { PreviewDisplayDialog } from "@/components/displays/preview-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useCreateDisplayGroupMutation,
  useGetDisplayGroupsQuery,
  useGetDisplaysQuery,
  useRequestDisplayRefreshMutation,
  useSetDisplayGroupsMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/map-display-to-display";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import { getNextDisplayGroupColorIndex } from "@/lib/display-group-colors";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { DisplayStatusFilter } from "@/components/displays/display-status-tabs";
import type { Display, DisplaySortField } from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
const DISPLAY_SORT_VALUES = ["alphabetical", "status", "location"] as const;

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
        const existing = groupsByDisplayId.get(displayId) ?? [];
        existing.push(displayGroup);
        groupsByDisplayId.set(displayId, existing);
      }
    }
    return (displaysData?.items ?? []).map((display) =>
      withDisplayGroups(
        mapDisplayApiToDisplay(display),
        groupsByDisplayId.get(display.id) ?? [],
      ),
    );
  }, [displaysData?.items, displayGroupsData?.items]);
  const pageSize = 20;

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

  // Signature required by DisplayCard; this opens edit from the dashboard.
  const handleToggleDisplay = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsEditDialogOpen(true);
    },
    [setSelectedDisplay, setIsEditDialogOpen],
  );

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
      } catch (error) {
        toast.error(
          `Failed to save display details: ${getApiErrorMessage(
            error,
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
      } catch (error) {
        toast.error(
          `Display details were saved, but display-group assignment failed: ${getApiErrorMessage(
            error,
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

  const filteredDisplays = useMemo(
    () =>
      displays.filter((display) => {
        if (statusFilter !== "all" && display.status !== statusFilter) {
          return false;
        }

        if (search.length > 0) {
          const searchLower = search.toLowerCase();
          const matchesName = display.name.toLowerCase().includes(searchLower);
          const matchesLocation = display.location
            .toLowerCase()
            .includes(searchLower);
          const matchesIdentifier = display.identifier
            ?.toLowerCase()
            .includes(searchLower);
          if (!matchesName && !matchesLocation && !matchesIdentifier) {
            return false;
          }
        }

        return true;
      }),
    [displays, statusFilter, search],
  );

  const sortedDisplays = useMemo(
    () =>
      [...filteredDisplays].sort((a, b) => {
        switch (sortBy) {
          case "alphabetical":
            return a.name.localeCompare(b.name);
          case "status":
            return a.status.localeCompare(b.status);
          case "location":
            return a.location.localeCompare(b.location);
          default:
            return 0;
        }
      }),
    [filteredDisplays, sortBy],
  );

  const paginatedDisplays = useMemo(
    () => sortedDisplays.slice((page - 1) * pageSize, page * pageSize),
    [sortedDisplays, page],
  );

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Displays"
        actions={
          <Can permission="displays:create">
            <Button onClick={() => setIsAddInfoDialogOpen(true)}>
              <IconPlus className="size-4" />
              Add Display
            </Button>
          </Can>
        }
      />

      {isError ? (
        <DashboardPage.Banner tone="danger">
          {loadErrorMessage}
        </DashboardPage.Banner>
      ) : null}

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <DisplayStatusTabs
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
          />

          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <DisplayFilterPopover />
            <DisplaySortSelect
              value={sortBy}
              onValueChange={handleSortChange}
            />
            <DisplaySearchInput
              value={search}
              onChange={handleSearchChange}
              className="w-full max-w-none md:w-72"
            />
            <Can permission="displays:update">
              <Button
                variant="outline"
                onClick={() => setIsGroupManagerOpen(true)}
              >
                <IconSettings className="size-4" />
                Manage Groups
              </Button>
            </Can>
          </div>
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] rounded-lg" />
              ))}
            </div>
          ) : (
            <DisplayGrid
              items={paginatedDisplays}
              onViewDetails={handleViewDetails}
              onPreviewPage={handlePreviewPage}
              onRefreshPage={handleRefreshPage}
              onToggleDisplay={handleToggleDisplay}
              canUpdate={canUpdateDisplay}
            />
          )}
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={pageSize}
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
