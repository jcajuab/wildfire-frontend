"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { EditPlaylistItemsDialog } from "@/components/playlists/edit-playlist-items-dialog";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { SearchControl } from "@/components/common/search-control";
import { PlaylistFilterPopover } from "@/components/playlists/playlist-filter-popover";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { Button } from "@/components/ui/button";
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
    editorPlaylist,
    playlistToDelete,
    deleteDialogOpen,
    isSavingPlaylistItems,
    setPage,
    setEditorPlaylist,
    setPlaylistToDelete,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleEditorDialogOpenChange,
    handleOpenEditor,
    handleSaveItems,
    handleDeletePlaylist,
    deletePlaylistMutation,
  } = usePlaylistsPage();

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Playlists"
        actions={
          <Can permission="playlists:create">
            <Button asChild>
              <Link href="/admin/playlists/create">
                <IconPlus className="size-4" />
                Create Playlist
              </Link>
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
              onEditManage={canUpdatePlaylist ? handleOpenEditor : undefined}
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

      {editorPlaylist && (
        <EditPlaylistItemsDialog
          open={editorPlaylist !== null}
          onOpenChange={handleEditorDialogOpenChange}
          playlist={editorPlaylist}
          availableContent={availableContent}
          availableDisplays={availableDisplays}
          onSave={handleSaveItems}
          isSaving={isSavingPlaylistItems}
        />
      )}

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
