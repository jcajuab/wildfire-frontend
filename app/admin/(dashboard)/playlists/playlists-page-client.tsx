"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { BulkDeleteConfirmDialog } from "@/components/common/bulk-delete-confirm-dialog";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { PlaylistsToolbar } from "@/components/playlists/playlists-toolbar";
import { PaginationFooter } from "@/components/common/pagination-footer";
import {
  playlistsApi,
  type BackendPlaylistListResponse,
  type PlaylistListQuery,
} from "@/lib/api/playlists-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { runBulkAction } from "@/lib/bulk-action";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import { PAGE_SIZE, usePlaylistsPage } from "./_hooks/use-playlists-page";

export function PlaylistsListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: PlaylistListQuery;
  readonly data: BackendPlaylistListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      playlistsApi.endpoints.listPlaylists.select(queryArgs)(state).data,
  );

  useEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      playlistsApi.util.upsertQueryData("listPlaylists", queryArgs, data),
    );
  }, [cachedData, dispatch, queryArgs, data]);
  return null;
}

interface PlaylistsPageViewProps {
  readonly initialQueryArgs?: PlaylistListQuery;
  readonly initialData?: BackendPlaylistListResponse;
}

export function PlaylistsPageView({
  initialQueryArgs,
  initialData,
}: PlaylistsPageViewProps = {}): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageId = searchParams.get("manage");
  const handledManageRef = useRef<string | null>(null);
  const {
    selectedItems,
    selectedIds,
    selectedCount,
    clearSelection,
    removeSelectedIds,
    setItemSelected,
  } = useBulkSelection();
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const {
    canCreatePlaylist,
    canUpdatePlaylist,
    canDeletePlaylist,
    isLoading,
    isFetching,
    statusFilter,
    search,
    page,
    playlists,
    totalPlaylists,
    playlistToDelete,
    deleteDialogOpen,
    setPage,
    setPlaylistToDelete,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleEditPlaylist,
    handleDeletePlaylist,
    deletePlaylistMutation,
  } = usePlaylistsPage(
    initialQueryArgs != null && initialData != null
      ? {
          initialList: {
            queryArgs: initialQueryArgs,
            data: initialData,
          },
        }
      : undefined,
  );

  useEffect(() => {
    clearSelection();
  }, [clearSelection, search, statusFilter]);

  const selectedPlaylistLabels = selectedItems.map((item) => item.label);
  const selectedPlaylistCount = selectedCount;
  const deleteSelectedLabel =
    selectedPlaylistCount === 1
      ? "Delete 1 playlist"
      : `Delete ${selectedPlaylistCount} playlists`;

  const handleConfirmBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const result = await runBulkAction(selectedItems, (item) =>
      deletePlaylistMutation(item.id),
    );

    if (result.successfulItems.length > 0) {
      removeSelectedIds(result.successfulItems.map((item) => item.id));
      toast.success(
        result.successfulItems.length === 1
          ? "Successfully deleted 1 playlist"
          : `Successfully deleted ${result.successfulItems.length} playlists`,
      );
    }

    const firstFailure = result.failedItems[0];
    if (firstFailure) {
      const message = getApiErrorMessage(
        firstFailure.error,
        "Some playlists could not be deleted.",
      );
      toast.error(
        `Failed to delete ${result.failedItems.length} of ${selectedItems.length} playlists. ${message}`,
      );
    }

    if (result.failedItems.length === 0) {
      setIsSelectionMode(false);
      clearSelection();
    }
  }, [deletePlaylistMutation, removeSelectedIds, selectedItems, clearSelection]);

  const handleCancelSelectionMode = useCallback(() => {
    clearSelection();
    setIsSelectionMode(false);
  }, [clearSelection]);

  useEffect(() => {
    if (manageId && handledManageRef.current !== manageId) {
      handledManageRef.current = manageId;
      router.replace(getPlaylistEditPath(manageId));
    }
  }, [manageId, router]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      {initialQueryArgs != null && initialData != null ? (
        <PlaylistsListCacheSeeder
          queryArgs={initialQueryArgs}
          data={initialData}
        />
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PlaylistsToolbar
            statusFilter={statusFilter}
            search={search}
            filteredResultsCount={totalPlaylists}
            isFetching={isFetching && !isLoading}
            canCreatePlaylist={canCreatePlaylist}
            canDeletePlaylist={canDeletePlaylist}
            bulkState={
              isSelectionMode
                ? {
                    mode: "bulk-delete",
                    selectedCount: selectedPlaylistCount,
                    onDelete: () => setIsBulkDeleteDialogOpen(true),
                    onCancel: handleCancelSelectionMode,
                  }
                : {
                    mode: "normal",
                    onEnterBulkDelete: () => setIsSelectionMode(true),
                  }
            }
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onClearFilters={handleClearFilters}
          />

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">
                    Loading playlists...
                  </span>
                </div>
              </div>
            ) : (
              <PlaylistGrid
                playlists={playlists}
                onEdit={canUpdatePlaylist ? handleEditPlaylist : undefined}
                onDelete={canDeletePlaylist ? handleDeletePlaylist : undefined}
                selectedIds={isSelectionMode ? selectedIds : undefined}
                onSelectionChange={
                  canDeletePlaylist && isSelectionMode
                    ? (playlist, checked) =>
                        setItemSelected(
                          { id: playlist.id, label: playlist.name },
                          checked,
                        )
                    : undefined
                }
              />
            )}
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={totalPlaylists}
            onPageChange={setPage}
            variant="compact"
            alwaysShow
          />
        </footer>
      </section>

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

      <BulkDeleteConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedLabels={selectedPlaylistLabels}
        title="Delete selected playlists?"
        itemName="playlist"
        itemNamePlural="playlists"
        confirmLabel={deleteSelectedLabel}
        actionDescription="This will permanently delete"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
