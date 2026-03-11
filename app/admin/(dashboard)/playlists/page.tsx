"use client";

import type { ReactElement } from "react";
import { IconPlus, IconPresentation } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { CreatePlaylistDialog } from "@/components/playlists/create-playlist-dialog";
import { EditPlaylistItemsDialog } from "@/components/playlists/edit-playlist-items-dialog";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { SearchControl } from "@/components/common/search-control";
import { PlaylistFilterPopover } from "@/components/playlists/playlist-filter-popover";
import { PaginationFooter } from "@/components/common/pagination-footer";
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
import { PAGE_SIZE, usePlaylistsPage } from "./use-playlists-page";

export default function PlaylistsPage(): ReactElement {
  const {
    canUpdatePlaylist,
    canDeletePlaylist,
    statusFilter,
    search,
    page,
    playlists,
    totalPlaylists,
    availableContent,
    availableDisplays,
    createDialogOpen,
    previewPlaylist,
    editPlaylist,
    manageItemsPlaylist,
    playlistToDelete,
    deleteDialogOpen,
    editName,
    editDescription,
    isSavingPlaylistItems,
    setPage,
    setEditPlaylist,
    setPreviewPlaylist,
    setPlaylistToDelete,
    setEditName,
    setEditDescription,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleCreateDialogOpenChange,
    handleManageItemsDialogOpenChange,
    handleCreatePlaylist,
    handleEditPlaylist,
    handleManageItems,
    handleSaveItems,
    handlePreviewPlaylist,
    handleDeletePlaylist,
    handleUpdatePlaylist,
    deletePlaylistMutation,
  } = usePlaylistsPage();

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Playlists"
        actions={
          <Can permission="playlists:create">
            <Button onClick={() => handleCreateDialogOpenChange(true)}>
              <IconPlus className="size-4" />
              Create Playlist
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <PlaylistFilterPopover
                statusFilter={statusFilter}
                filteredResultsCount={totalPlaylists}
                onStatusFilterChange={handleStatusFilterChange}
                onClearFilters={handleClearFilters}
              />
              <SearchControl
                value={search}
                onChange={handleSearchChange}
                ariaLabel="Search playlists"
                placeholder="Search playlists…"
                className="w-full max-w-none sm:w-72"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            <PlaylistGrid
              playlists={playlists}
              onEdit={canUpdatePlaylist ? handleEditPlaylist : undefined}
              onManageItems={canUpdatePlaylist ? handleManageItems : undefined}
              onPreview={handlePreviewPlaylist}
              onDelete={canDeletePlaylist ? handleDeletePlaylist : undefined}
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={totalPlaylists}
            onPageChange={setPage}
            variant="compact"
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        onCreate={handleCreatePlaylist}
        availableContent={availableContent}
        availableDisplays={availableDisplays}
      />

      {manageItemsPlaylist && (
        <EditPlaylistItemsDialog
          open={manageItemsPlaylist !== null}
          onOpenChange={handleManageItemsDialogOpenChange}
          playlist={manageItemsPlaylist}
          availableContent={availableContent}
          availableDisplays={availableDisplays}
          onSave={handleSaveItems}
          isSaving={isSavingPlaylistItems}
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
              onClick={handleUpdatePlaylist}
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
              <div className="rounded-md border border-border p-3">
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
        onOpenChange={(open) => {
          if (!open) setPlaylistToDelete(null);
        }}
        title="Delete playlist?"
        description={
          playlistToDelete
            ? `This will permanently delete "${playlistToDelete.name}".`
            : undefined
        }
        confirmLabel="Delete playlist"
        errorFallback="Failed to delete playlist."
        onConfirm={async () => {
          if (!playlistToDelete) return;
          await deletePlaylistMutation(playlistToDelete.id);
          setPlaylistToDelete(null);
        }}
      />
    </DashboardPage.Root>
  );
}
