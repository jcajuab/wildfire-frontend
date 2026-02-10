"use client";

import { useState, useCallback, useMemo } from "react";
import { IconPlus, IconPresentation } from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { CreatePlaylistDialog } from "@/components/playlists/create-playlist-dialog";
import { Pagination } from "@/components/playlists/pagination";
import { PlaylistFilterPopover } from "@/components/playlists/playlist-filter-popover";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { PlaylistSearchInput } from "@/components/playlists/playlist-search-input";
import { PlaylistSortSelect } from "@/components/playlists/playlist-sort-select";
import { PlaylistStatusTabs } from "@/components/playlists/playlist-status-tabs";
import type { DurationFilter } from "@/components/playlists/playlist-filter-popover";
import type { StatusFilter } from "@/components/playlists/playlist-status-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [sortBy, setSortBy] = useState<PlaylistSortField>("recent");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [deletePlaylist, setDeletePlaylist] = useState<Playlist | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);

  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

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

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower),
      );
    }

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
    setEditPlaylist(playlist);
    setEditName(playlist.name);
    setEditDescription(playlist.description ?? "");
  }, []);

  const handlePreviewPlaylist = useCallback((playlist: Playlist) => {
    setPreviewPlaylist(playlist);
  }, []);

  const handleDeletePlaylist = useCallback((playlist: Playlist) => {
    setDeletePlaylist(playlist);
    setDeleteDialogOpen(true);
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

        <div className="flex-1 overflow-y-auto px-6">
          <PlaylistGrid
            playlists={paginatedPlaylists}
            onEdit={handleEditPlaylist}
            onPreview={handlePreviewPlaylist}
            onDelete={handleDeletePlaylist}
          />
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredPlaylists.length}
          onPageChange={setPage}
        />
      </div>

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreatePlaylist}
        availableContent={mockAvailableContent}
      />

      <Dialog
        open={editPlaylist !== null}
        onOpenChange={(open) => {
          if (!open) setEditPlaylist(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-playlist-name">Name</Label>
              <Input
                id="edit-playlist-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-playlist-description">Description</Label>
              <Textarea
                id="edit-playlist-description"
                rows={3}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlaylist(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editPlaylist || editName.trim().length === 0) return;
                setPlaylists((prev) =>
                  prev.map((playlist) =>
                    playlist.id === editPlaylist.id
                      ? {
                          ...playlist,
                          name: editName.trim(),
                          description: editDescription.trim() || null,
                          updatedAt: new Date().toISOString(),
                        }
                      : playlist,
                  ),
                );
                setEditPlaylist(null);
              }}
              disabled={editName.trim().length === 0}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewPlaylist !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPlaylist(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPresentation className="size-4" />
              Playlist Preview
            </DialogTitle>
          </DialogHeader>
          {previewPlaylist ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {previewPlaylist.name}
              </p>
              <p>
                <span className="text-muted-foreground">Items:</span>{" "}
                {previewPlaylist.items.length}
              </p>
              <p>
                <span className="text-muted-foreground">Duration:</span>{" "}
                {previewPlaylist.totalDuration} sec
              </p>
              <div className="rounded-md border p-3">
                {previewPlaylist.items.map((item) => (
                  <p key={item.id} className="text-xs text-muted-foreground">
                    • {item.content.title} ({item.duration}s)
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPlaylist(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete playlist?"
        description={
          deletePlaylist
            ? `This will permanently delete "${deletePlaylist.name}".`
            : undefined
        }
        confirmLabel="Delete playlist"
        onConfirm={() => {
          if (!deletePlaylist) return;
          setPlaylists((prev) =>
            prev.filter((playlist) => playlist.id !== deletePlaylist.id),
          );
          setDeletePlaylist(null);
        }}
      />
    </>
  );
}
