"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconPlus, IconPresentation } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
import { CreatePlaylistDialog } from "@/components/playlists/create-playlist-dialog";
import {
  EditPlaylistItemsDialog,
  type PlaylistItemsDiff,
} from "@/components/playlists/edit-playlist-items-dialog";
import { Pagination } from "@/components/playlists/pagination";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { PlaylistSearchInput } from "@/components/playlists/playlist-search-input";
import { PlaylistSortSelect } from "@/components/playlists/playlist-sort-select";
import { PlaylistStatusTabs } from "@/components/playlists/playlist-status-tabs";
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
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useListContentQuery } from "@/lib/api/content-api";
import {
  type PlaylistListQuery,
  useAddPlaylistItemMutation,
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useListPlaylistsQuery,
  useUpdatePlaylistMutation,
  useUpdatePlaylistItemMutation,
  useDeletePlaylistItemMutation,
} from "@/lib/api/playlists-api";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import {
  mapBackendPlaylistBase,
  mapBackendPlaylistWithItems,
} from "@/lib/mappers/playlist-mapper";
import type { StatusFilter } from "@/components/playlists/playlist-status-tabs";
import type { Content } from "@/types/content";
import type {
  Playlist,
  PlaylistItem,
  PlaylistSortField,
} from "@/types/playlist";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const PLAYLIST_SORT_VALUES = ["recent", "name"] as const;

interface NewPlaylistPayload {
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number;
}

export default function PlaylistsPage(): ReactElement {
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");
  const [statusFilter, setStatusFilter] = useQueryEnumState<StatusFilter>(
    "status",
    "all",
    PLAYLIST_STATUS_VALUES,
  );
  const [sortBy, setSortBy] = useQueryEnumState<PlaylistSortField>(
    "sort",
    "recent",
    PLAYLIST_SORT_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const pageSize = 12;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [manageItemsPlaylist, setManageItemsPlaylist] =
    useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page,
      pageSize,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.length > 0 ? search : undefined,
      sortBy: sortBy === "name" ? "name" : "updatedAt",
      sortDirection: sortBy === "name" ? "asc" : "desc",
    }),
    [page, pageSize, search, sortBy, statusFilter],
  );
  const { data: playlistsData } = useListPlaylistsQuery(playlistQuery);
  const { data: contentData } = useListContentQuery({ page: 1, pageSize: 100 });
  const [loadPlaylist] = useLazyGetPlaylistQuery();
  const [createPlaylist] = useCreatePlaylistMutation();
  const [addPlaylistItem] = useAddPlaylistItemMutation();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [deletePlaylistMutation] = useDeletePlaylistMutation();
  const [updatePlaylistItem] = useUpdatePlaylistItemMutation();
  const [deletePlaylistItem] = useDeletePlaylistItemMutation();
  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistBase),
    [playlistsData?.items],
  );
  const availableContent = useMemo<Content[]>(
    () => (contentData?.items ?? []).map(mapBackendContentToContent),
    [contentData?.items],
  );

  const handleStatusFilterChange = useCallback(
    (value: StatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleSortChange = useCallback(
    (value: PlaylistSortField) => {
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

  const totalPlaylists = playlistsData?.total ?? 0;

  const handleCreatePlaylist = useCallback(
    async (data: NewPlaylistPayload) => {
      try {
        const created = await createPlaylist({
          name: data.name,
          description: data.description,
        }).unwrap();
        await Promise.all(
          data.items.map((item, index) =>
            addPlaylistItem({
              playlistId: created.id,
              contentId: item.content.id,
              sequence: index + 1,
              duration: item.duration,
            }).unwrap(),
          ),
        );
        toast.success("Playlist created.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create playlist.",
        );
      }
    },
    [addPlaylistItem, createPlaylist],
  );

  const handleEditPlaylist = useCallback((playlist: Playlist) => {
    setEditPlaylist(playlist);
    setEditName(playlist.name);
    setEditDescription(playlist.description ?? "");
  }, []);

  const handleManageItems = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setManageItemsPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch {
        toast.error("Failed to load playlist items.");
      }
    },
    [loadPlaylist],
  );

  const handleSaveItems = useCallback(
    async (playlistId: string, diff: PlaylistItemsDiff) => {
      try {
        const promises: Promise<unknown>[] = [];

        diff.deleted.forEach((itemId) => {
          promises.push(deletePlaylistItem({ playlistId, itemId }).unwrap());
        });

        diff.updated.forEach((item) => {
          promises.push(
            updatePlaylistItem({
              playlistId,
              itemId: item.itemId,
              sequence: item.sequence,
              duration: item.duration,
            }).unwrap(),
          );
        });

        diff.added.forEach((item) => {
          promises.push(
            addPlaylistItem({
              playlistId,
              contentId: item.contentId,
              sequence: item.sequence,
              duration: item.duration,
            }).unwrap(),
          );
        });

        await Promise.all(promises);
        toast.success("Playlist items updated.");
        setManageItemsPlaylist(null);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to update playlist items.",
        );
      }
    },
    [addPlaylistItem, deletePlaylistItem, updatePlaylistItem],
  );

  const handlePreviewPlaylist = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setPreviewPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch {
        setPreviewPlaylist(playlist);
      }
    },
    [loadPlaylist],
  );

  const handleDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setDeleteDialogOpen(true);
  }, []);

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Playlists"
        actions={
          <Can permission="playlists:create">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <IconPlus className="size-4" />
              Create Playlist
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <PlaylistStatusTabs
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
          />

          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <PlaylistSortSelect
              value={sortBy}
              onValueChange={handleSortChange}
            />
            <PlaylistSearchInput
              value={search}
              onChange={handleSearchChange}
              className="w-full max-w-none md:w-72"
            />
          </div>
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <PlaylistGrid
            playlists={playlists}
            onEdit={handleEditPlaylist}
            onManageItems={handleManageItems}
            onPreview={handlePreviewPlaylist}
            onDelete={handleDeletePlaylist}
            canUpdate={canUpdatePlaylist}
            canDelete={canDeletePlaylist}
          />
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalPlaylists}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreatePlaylist}
        availableContent={availableContent}
      />

      {manageItemsPlaylist && (
        <EditPlaylistItemsDialog
          open={manageItemsPlaylist !== null}
          onOpenChange={(open) => {
            if (!open) setManageItemsPlaylist(null);
          }}
          playlist={manageItemsPlaylist}
          availableContent={availableContent}
          onSave={handleSaveItems}
        />
      )}

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
              onClick={async () => {
                if (!editPlaylist || editName.trim().length === 0) return;
                try {
                  await updatePlaylist({
                    id: editPlaylist.id,
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                  }).unwrap();
                  setEditPlaylist(null);
                  toast.success("Playlist updated.");
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to update playlist.",
                  );
                }
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
          playlistToDelete
            ? `This will permanently delete "${playlistToDelete.name}".`
            : undefined
        }
        confirmLabel="Delete playlist"
        onConfirm={async () => {
          if (!playlistToDelete) return;
          try {
            await deletePlaylistMutation(playlistToDelete.id).unwrap();
            setPlaylistToDelete(null);
            toast.success("Playlist deleted.");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to delete playlist.",
            );
            throw err;
          }
        }}
      />
    </DashboardPage.Root>
  );
}
