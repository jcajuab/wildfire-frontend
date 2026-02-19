"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { Pagination } from "@/components/content/pagination";
import { DeviceRegistrationInfoDialog } from "@/components/displays/device-registration-info-dialog";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
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
import {
  useCreateDeviceGroupMutation,
  useGetDeviceGroupsQuery,
  useGetDevicesQuery,
  useRequestDeviceRefreshMutation,
  useSetDeviceGroupsMutation,
  useUpdateDeviceMutation,
} from "@/lib/api/devices-api";
import {
  mapDeviceToDisplay,
  withDisplayGroups,
} from "@/lib/map-device-to-display";
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

const DEVICE_SELF_REGISTRATION_MESSAGE =
  "Devices are managed via self-registration. Use a one-time pairing code to register or update displays.";

export default function DisplaysPage(): ReactElement {
  const canUpdateDisplay = useCan("devices:update");
  const canDeleteDisplay = useCan("devices:delete");
  const { data: devicesData, isLoading, isError, error } = useGetDevicesQuery();
  const { data: deviceGroupsData } = useGetDeviceGroupsQuery();

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
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);
  const [updateDevice] = useUpdateDeviceMutation();
  const [setDeviceGroups] = useSetDeviceGroupsMutation();
  const [createDeviceGroup] = useCreateDeviceGroupMutation();
  const [requestDeviceRefresh] = useRequestDeviceRefreshMutation();

  const displays: Display[] = useMemo(() => {
    const groupNamesByDeviceId = new Map<string, string[]>();
    for (const group of deviceGroupsData?.items ?? []) {
      for (const deviceId of group.deviceIds) {
        const existing = groupNamesByDeviceId.get(deviceId) ?? [];
        existing.push(group.name);
        groupNamesByDeviceId.set(deviceId, existing);
      }
    }
    return (devicesData?.items ?? []).map((device) =>
      withDisplayGroups(
        mapDeviceToDisplay(device),
        groupNamesByDeviceId.get(device.id) ?? [],
      ),
    );
  }, [devicesData?.items, deviceGroupsData?.items]);
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
        await requestDeviceRefresh({ deviceId: display.id }).unwrap();
        toast.success(
          `"${display.name}" will refresh on its next device poll.`,
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to queue display refresh.",
        );
      }
    },
    [requestDeviceRefresh],
  );

  // Signature required by DisplayCard; this opens edit from the dashboard.
  const handleToggleDisplay = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsEditDialogOpen(true);
    },
    [setSelectedDisplay, setIsEditDialogOpen],
  );

  const handleRemoveDisplay = useCallback((display: Display) => {
    void display;
    toast.info(DEVICE_SELF_REGISTRATION_MESSAGE);
  }, []);

  const handleEditFromView = useCallback((display: Display) => {
    setSelectedDisplay(display);
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveDisplay = useCallback(
    async (display: Display) => {
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
        await updateDevice({
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

        const existingByName = new Map(
          (deviceGroupsData?.items ?? []).map((group) => [
            group.name,
            group.id,
          ]),
        );
        const nextGroupIds: string[] = [];
        for (const rawName of display.groups) {
          const name = rawName.trim();
          if (name.length === 0) continue;
          const existingId = existingByName.get(name);
          if (existingId) {
            nextGroupIds.push(existingId);
            continue;
          }
          const created = await createDeviceGroup({ name }).unwrap();
          existingByName.set(created.name, created.id);
          nextGroupIds.push(created.id);
        }
        await setDeviceGroups({
          deviceId: display.id,
          groupIds: nextGroupIds,
        }).unwrap();
        toast.success(`Updated "${display.name}".`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update display.",
        );
      }
    },
    [updateDevice, deviceGroupsData, createDeviceGroup, setDeviceGroups],
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

  useEffect(() => {
    if (!isError) return;
    toast.error(
      error && "status" in error && error.status === 403
        ? "You don’t have permission to view displays."
        : "Failed to load displays.",
    );
  }, [isError, error]);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Displays"
        actions={
          <Can permission="devices:create">
            <Button onClick={() => setIsAddInfoDialogOpen(true)}>
              <IconPlus className="size-4" />
              Add Display
            </Button>
          </Can>
        }
      />

      {isError ? (
        <DashboardPage.Banner tone="danger">
          Failed to load displays. Check your connection and permissions.
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
              onRemoveDisplay={handleRemoveDisplay}
              canUpdate={canUpdateDisplay}
              canDelete={canDeleteDisplay}
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

      <DeviceRegistrationInfoDialog
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
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveDisplay}
      />
    </DashboardPage.Root>
  );
}
