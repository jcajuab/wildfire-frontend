"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  PlaylistStatusTabs,
  PlaylistFilterPopover,
  PlaylistSortSelect,
  PlaylistSearchInput,
  PlaylistGrid,
  Pagination,
  CreatePlaylistDialog,
  type StatusFilter,
  type DurationFilter,
} from "@/components/playlists";
import type { Playlist, PlaylistSortField } from "@/types/playlist";
import type { Content } from "@/types/content";

// Mock playlists for demonstration
const mockPlaylists: Playlist[] = [
  {
    id: "1",
    name: "Demo Playlist",
    description: null,
    status: "DRAFT",
    items: [
      {
        id: "item-1",
        content: {
          id: "content-1",
          title: "Hello",
          type: "IMAGE",
          mimeType: "image/png",
          fileSize: 1024,
          checksum: "abc123",
          width: 1920,
          height: 1080,
          duration: null,
          status: "IN_USE",
          createdAt: "2024-01-15T10:00:00Z",
          createdBy: { id: "user-1", name: "Admin" },
        },
        duration: 5,
        order: 0,
      },
      {
        id: "item-2",
        content: {
          id: "content-2",
          title: "World",
          type: "IMAGE",
          mimeType: "image/png",
          fileSize: 2048,
          checksum: "def456",
          width: 1920,
          height: 1080,
          duration: null,
          status: "IN_USE",
          createdAt: "2024-01-15T10:00:00Z",
          createdBy: { id: "user-1", name: "Admin" },
        },
        duration: 5,
        order: 1,
      },
    ],
    totalDuration: 10,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    createdBy: { id: "user-1", name: "Admin" },
  },
];

// Mock available content for the create dialog
const mockAvailableContent: Content[] = [
  {
    id: "content-1",
    title: "Hello",
    type: "IMAGE",
    mimeType: "image/png",
    fileSize: 1024,
    checksum: "abc123",
    width: 1920,
    height: 1080,
    duration: null,
    status: "IN_USE",
    createdAt: "2024-01-15T10:00:00Z",
    createdBy: { id: "user-1", name: "Admin" },
  },
  {
    id: "content-2",
    title: "World",
    type: "IMAGE",
    mimeType: "image/png",
    fileSize: 2048,
    checksum: "def456",
    width: 1920,
    height: 1080,
    duration: null,
    status: "IN_USE",
    createdAt: "2024-01-15T10:00:00Z",
    createdBy: { id: "user-1", name: "Admin" },
  },
];

export default function PlaylistsPage(): React.ReactElement {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [sortBy, setSortBy] = useState<PlaylistSortField>("recent");
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Playlists state (would come from API in real app)
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);

  // Filter and sort playlists
  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Duration filter
    if (durationFilter !== "all") {
      result = result.filter((p) => {
        const duration = p.totalDuration;
        switch (durationFilter) {
          case "short":
            return duration < 60;
          case "medium":
            return duration >= 60 && duration <= 300;
          case "long":
            return duration > 300;
          default:
            return true;
        }
      });
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower),
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "duration":
          return b.totalDuration - a.totalDuration;
        case "items":
          return b.items.length - a.items.length;
        case "recent":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });

    return result;
  }, [playlists, statusFilter, durationFilter, search, sortBy]);

  // Paginate
  const paginatedPlaylists = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlaylists.slice(start, start + pageSize);
  }, [filteredPlaylists, page, pageSize]);

  const handleCreatePlaylist = useCallback(
    (
      data: Omit<
        Playlist,
        "id" | "createdAt" | "updatedAt" | "createdBy" | "status"
      >,
    ) => {
      const newPlaylist: Playlist = {
        ...data,
        id: `playlist-${Date.now()}`,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { id: "user-1", name: "Admin" },
      };
      setPlaylists((prev) => [newPlaylist, ...prev]);
    },
    [],
  );

  const handleEditPlaylist = useCallback((playlist: Playlist) => {
    // TODO: Open edit dialog
    console.log("Edit playlist:", playlist);
  }, []);

  const handlePreviewPlaylist = useCallback((playlist: Playlist) => {
    // TODO: Open preview
    console.log("Preview playlist:", playlist);
  }, []);

  const handleDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
  }, []);

  return (
    <>
      <PageHeader title="Playlists">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <IconPlus className="size-4" />
          Create Playlist
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 pb-4">
          <PlaylistStatusTabs
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
          <div className="flex items-center gap-2">
            <PlaylistFilterPopover
              durationFilter={durationFilter}
              onDurationFilterChange={setDurationFilter}
            />
            <PlaylistSortSelect value={sortBy} onValueChange={setSortBy} />
            <PlaylistSearchInput value={search} onChange={setSearch} />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6">
          <PlaylistGrid
            playlists={paginatedPlaylists}
            onEdit={handleEditPlaylist}
            onPreview={handlePreviewPlaylist}
            onDelete={handleDeletePlaylist}
          />
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredPlaylists.length}
          onPageChange={setPage}
        />
      </div>

      {/* Create Playlist Dialog */}
      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreatePlaylist}
        availableContent={mockAvailableContent}
      />
    </>
  );
}
