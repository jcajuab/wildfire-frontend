"use client";

import { useState, useCallback } from "react";
import { IconPlus } from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { AddDisplayDialog } from "@/components/displays/add-display-dialog";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaySearchInput } from "@/components/displays/display-search-input";
import { DisplaySortSelect } from "@/components/displays/display-sort-select";
import { DisplayStatusTabs } from "@/components/displays/display-status-tabs";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/content/pagination";
import { Button } from "@/components/ui/button";
import type { Display, DisplaySortField } from "@/types/display";
import type { DisplayStatusFilter } from "@/components/displays/display-status-tabs";

const mockDisplays: Display[] = [];

export default function DisplaysPage(): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<DisplayStatusFilter>("all");
  const [sortBy, setSortBy] = useState<DisplaySortField>("alphabetical");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
      prev.map((d) => (d.id === updatedDisplay.id ? updatedDisplay : d)),
    );
  }, []);

  // Filter displays based on current filters
  const filteredDisplays = displays.filter((display) => {
    if (statusFilter !== "all" && display.status !== statusFilter) {
      return false;
    }

    if (search) {
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
  });

  // Sort displays
  const sortedDisplays = [...filteredDisplays].sort((a, b) => {
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
  });

  // Paginate displays
  const paginatedDisplays = sortedDisplays.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Displays">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <IconPlus className="size-4" />
          Add Display
        </Button>
      </PageHeader>

      {infoMessage ? (
        <div className="mx-6 mb-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {infoMessage}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-3">
          <DisplayStatusTabs
            value={statusFilter}
            onValueChange={setStatusFilter}
          />

          <div className="flex items-center gap-2">
            <DisplayFilterPopover />
            <DisplaySortSelect value={sortBy} onValueChange={setSortBy} />
            <DisplaySearchInput value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <DisplayGrid
            items={paginatedDisplays}
            onViewDetails={handleViewDetails}
            onPreviewPage={handlePreviewPage}
            onRefreshPage={handleRefreshPage}
            onToggleDisplay={handleToggleDisplay}
            onRemoveDisplay={handleRemoveDisplay}
          />
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={sortedDisplays.length}
          onPageChange={setPage}
        />
      </div>

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
    </div>
  );
}
