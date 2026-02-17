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
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDevicesQuery } from "@/lib/api/devices-api";
import { mapDeviceToDisplay } from "@/lib/map-device-to-display";
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
  "Devices are managed via self-registration. Use the device API key to register or update displays.";

export default function DisplaysPage(): ReactElement {
  const canUpdateDisplay = useCan("devices:update");
  const canDeleteDisplay = useCan("devices:delete");
  const { data: devicesData, isLoading, isError, error } = useGetDevicesQuery();

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
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);

  const displays: Display[] = useMemo(
    () => (devicesData?.items ?? []).map(mapDeviceToDisplay),
    [devicesData?.items],
  );
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

  const handleRefreshPage = useCallback((display: Display) => {
    toast.info(
      `Refreshed "${display.name}". Reload the page to see latest data.`,
    );
  }, []);

  // Signature required by DisplayCard; we only show a toast (no toggle from dashboard).
  const handleToggleDisplay = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by card callback signature
    (_display: Display) => {
      toast.info(
        "Power state is not managed from the dashboard. Devices report their own status.",
      );
    },
    [],
  );

  const handleRemoveDisplay = useCallback((display: Display) => {
    void display;
    toast.info(DEVICE_SELF_REGISTRATION_MESSAGE);
  }, []);

  const handleEditFromView = useCallback((display: Display) => {
    void display;
    setIsViewDialogOpen(false);
    toast.info(DEVICE_SELF_REGISTRATION_MESSAGE);
  }, []);

  const handleEditPlaylist = useCallback((display: Display) => {
    toast.info(
      `Schedule assignment for "${display.name}" is done via the Schedules page.`,
    );
  }, []);

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
        open={isViewDialogOpen || isPreviewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          setIsPreviewDialogOpen(open);
        }}
        onEdit={handleEditFromView}
        onEditPlaylist={handleEditPlaylist}
        canEdit={canUpdateDisplay}
      />
    </DashboardPage.Root>
  );
}
