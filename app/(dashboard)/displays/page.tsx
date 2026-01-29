"use client";

import { useState, useCallback } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { Pagination } from "@/components/content";
import {
  DisplayStatusTabs,
  DisplaySortSelect,
  DisplaySearchInput,
  DisplayFilterPopover,
  DisplayGrid,
  AddDisplayDialog,
  ViewDisplayDialog,
  EditDisplayDialog,
} from "@/components/displays";
import type { DisplayStatusFilter } from "@/components/displays";
import type { Display, DisplaySortField } from "@/types/display";

// Mock data for demonstration - will be replaced with API data
const mockDisplays: Display[] = [];

export default function DisplaysPage(): React.ReactElement {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<DisplayStatusFilter>("all");
  const [sortBy, setSortBy] = useState<DisplaySortField>("alphabetical");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);

  // Display state (mock)
  const [displays, setDisplays] = useState<Display[]>(mockDisplays);

  // Pagination
  const pageSize = 20;

  // Handlers
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
    // TODO: Open preview in new tab
    console.log("Preview page:", display.id);
  }, []);

  const handleRefreshPage = useCallback((display: Display) => {
    // TODO: Send refresh command to display
    console.log("Refresh page:", display.id);
  }, []);

  const handleToggleDisplay = useCallback((display: Display) => {
    // TODO: Toggle display on/off
    console.log("Toggle display:", display.id);
  }, []);

  const handleRemoveDisplay = useCallback((display: Display) => {
    // TODO: Show confirmation dialog
    setDisplays((prev) => prev.filter((d) => d.id !== display.id));
  }, []);

  const handleEditFromView = useCallback((display: Display) => {
    setIsViewDialogOpen(false);
    setSelectedDisplay(display);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditPlaylist = useCallback((display: Display) => {
    // TODO: Navigate to playlist editor
    console.log("Edit playlist for:", display.id);
  }, []);

  const handleSaveEdit = useCallback((updatedDisplay: Display) => {
    setDisplays((prev) =>
      prev.map((d) => (d.id === updatedDisplay.id ? updatedDisplay : d)),
    );
  }, []);

  // Filter displays based on current filters
  const filteredDisplays = displays.filter((display) => {
    // Status filter
    if (statusFilter !== "all" && display.status !== statusFilter) {
      return false;
    }

    // Search filter
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

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
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

        {/* Display grid */}
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

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={sortedDisplays.length}
          onPageChange={setPage}
        />
      </div>

      {/* Add Display Dialog */}
      <AddDisplayDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onRegister={handleRegister}
      />

      {/* View Display Dialog */}
      <ViewDisplayDialog
        display={selectedDisplay}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        onEditPlaylist={handleEditPlaylist}
      />

      {/* Edit Display Dialog */}
      <EditDisplayDialog
        display={selectedDisplay}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
