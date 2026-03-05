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
  useCreateDisplayGroupMutation,
  useGetDisplayGroupsQuery,
  useGetDisplaysQuery,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
import { getBaseUrl } from "@/lib/api/base-query";
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
  const {
    data: displaysData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDisplaysQuery(undefined, {
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
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!canReadDisplays) return;
    const baseUrl = getBaseUrl();

    const stream = new EventSource(`${baseUrl}/displays/events`, {
      withCredentials: true,
    });
    const refresh = () => {
      void refetch();
    };
    stream.addEventListener("display_registered", refresh);
    stream.addEventListener("display_unregistered", refresh);

    return () => {
      stream.removeEventListener("display_registered", refresh);
      stream.removeEventListener("display_unregistered", refresh);
      stream.close();
    };
  }, [canReadDisplays, refetch]);

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

  const handleViewPage = useCallback((display: Display) => {
    const slug = display.displaySlug?.trim();
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
        notifyApiError(updateError, "Failed to save display details.");
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
              onViewPage={handleViewPage}
              onUnregisterDisplay={
                canDeleteDisplay ? handleUnregisterDisplay : undefined
              }
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
