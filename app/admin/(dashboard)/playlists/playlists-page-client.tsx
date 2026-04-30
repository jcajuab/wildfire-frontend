"use client";

import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";
import { SearchControl } from "@/components/common/search-control";
import { PlaylistFilterPopover } from "@/components/playlists/playlist-filter-popover";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { Button } from "@/components/ui/button";
import {
  playlistsApi,
  type BackendPlaylistListResponse,
  type PlaylistListQuery,
} from "@/lib/api/playlists-api";
import { useAppDispatch } from "@/lib/hooks";
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
  useLayoutEffect(() => {
    dispatch(
      playlistsApi.util.upsertQueryData("listPlaylists", queryArgs, data),
    );
  }, [dispatch, queryArgs, data]);
  return null;
}

export function PlaylistsPageView(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageId = searchParams.get("manage");
  const handledManageRef = useRef<string | null>(null);

  const {
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
  } = usePlaylistsPage();

  useEffect(() => {
    if (manageId && handledManageRef.current !== manageId) {
      handledManageRef.current = manageId;
      router.replace(getPlaylistEditPath(manageId));
    }
  }, [manageId, router]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Playlists">
        <Can permission="playlists:create">
          <Button asChild>
            <Link href="/admin/playlists/create">
              <IconPlus className="size-4" />
              Create Playlist
            </Link>
          </Button>
        </Can>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <PlaylistFilterPopover
                statusFilter={statusFilter}
                filteredResultsCount={totalPlaylists}
                isFetching={isFetching && !isLoading}
                onStatusFilterChange={handleStatusFilterChange}
                onClearFilters={handleClearFilters}
              />
              <SearchControl
                value={search}
                onChange={handleSearchChange}
                ariaLabel="Search playlists"
                placeholder="Search..."
                className="w-full max-w-none sm:w-72"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Loading playlists...</span>
                </div>
              </div>
            ) : (
              <PlaylistGrid
                playlists={playlists}
                onEdit={canUpdatePlaylist ? handleEditPlaylist : undefined}
                onDelete={canDeletePlaylist ? handleDeletePlaylist : undefined}
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
    </div>
  );
}
