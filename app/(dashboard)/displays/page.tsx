"use client";

import { useCallback, useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Pagination } from "@/components/content/pagination";
import { AddDisplayDialog } from "@/components/displays/add-display-dialog";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaySearchInput } from "@/components/displays/display-search-input";
import { DisplaySortSelect } from "@/components/displays/display-sort-select";
import { DisplayStatusTabs } from "@/components/displays/display-status-tabs";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { DisplayStatusFilter } from "@/components/displays/display-status-tabs";
import type { Display, DisplaySortField } from "@/types/display";

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;
const DISPLAY_SORT_VALUES = ["alphabetical", "status", "location"] as const;

const mockDisplays: Display[] = [];

export default function DisplaysPage(): React.ReactElement {
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

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [displayToRemove, setDisplayToRemove] = useState<Display | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [displays, setDisplays] = useState<Display[]>(mockDisplays);
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

  const handleRegister = useCallback(
    (displayData: Omit<Display, "id" | "createdAt">) => {
      const newDisplay: Display = {
        ...displayData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setDisplays((prev) => [newDisplay, ...prev]);
    },
    [],
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
    const refreshedAt = new Date().toLocaleTimeString();
    setInfoMessage(`Refreshed "${display.name}" at ${refreshedAt}.`);
  }, []);

  const handleToggleDisplay = useCallback((display: Display) => {
    setDisplays((prev) =>
      prev.map((currentDisplay) =>
        currentDisplay.id === display.id
          ? {
              ...currentDisplay,
              status: currentDisplay.status === "DOWN" ? "READY" : "DOWN",
            }
          : currentDisplay,
      ),
    );
    setInfoMessage(`Updated power state for "${display.name}".`);
  }, []);

  const handleRemoveDisplay = useCallback((display: Display) => {
    setDisplayToRemove(display);
    setIsRemoveDialogOpen(true);
  }, []);

  const handleEditFromView = useCallback((display: Display) => {
    setIsViewDialogOpen(false);
    setSelectedDisplay(display);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditPlaylist = useCallback((display: Display) => {
    setInfoMessage(
      `Playlist editing for "${display.name}" is unavailable in mock mode.`,
    );
  }, []);

  const handleSaveEdit = useCallback((updatedDisplay: Display) => {
    setDisplays((prev) =>
      prev.map((display) =>
        display.id === updatedDisplay.id ? updatedDisplay : display,
      ),
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
          if (!matchesName && !matchesLocation) {
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
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <IconPlus className="size-4" />
            Add Display
          </Button>
        }
      />

      {infoMessage ? (
        <DashboardPage.Banner>{infoMessage}</DashboardPage.Banner>
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
          <DisplayGrid
            items={paginatedDisplays}
            onViewDetails={handleViewDetails}
            onPreviewPage={handlePreviewPage}
            onRefreshPage={handleRefreshPage}
            onToggleDisplay={handleToggleDisplay}
            onRemoveDisplay={handleRemoveDisplay}
          />
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

      <AddDisplayDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onRegister={handleRegister}
      />

      <ViewDisplayDialog
        display={selectedDisplay}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        onEditPlaylist={handleEditPlaylist}
      />

      <EditDisplayDialog
        display={selectedDisplay}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />

      <ViewDisplayDialog
        display={selectedDisplay}
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        onEdit={handleEditFromView}
        onEditPlaylist={handleEditPlaylist}
      />

      <ConfirmActionDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        title="Remove display?"
        description={
          displayToRemove
            ? `This will permanently remove "${displayToRemove.name}".`
            : undefined
        }
        confirmLabel="Remove display"
        onConfirm={() => {
          if (!displayToRemove) return;
          setDisplays((prev) =>
            prev.filter((display) => display.id !== displayToRemove.id),
          );
          setDisplayToRemove(null);
        }}
      />
    </DashboardPage.Root>
  );
}
