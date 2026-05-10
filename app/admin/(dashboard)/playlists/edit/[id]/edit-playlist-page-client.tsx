"use client";

import type { ReactElement } from "react";
import { useCallback, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  EditPlaylistForm,
  toDrafts,
  type PlaylistItemsAtomicSnapshot,
} from "@/components/playlists/edit-playlist-form";
import { type DraftItem } from "@/components/playlists/sortable-item-row";
import { MAX_BASE_DURATION_SECONDS } from "@/components/playlists/create-playlist-form";
import { Button } from "@/components/ui/button";
import {
  playlistsApi,
  type BackendPlaylistWithItems,
} from "@/lib/api/playlists-api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { useEditPlaylistPage } from "./use-edit-playlist-page";

export function PlaylistDetailCacheSeeder({
  playlistId,
  data,
}: {
  readonly playlistId: string;
  readonly data: BackendPlaylistWithItems;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      playlistsApi.endpoints.getPlaylist.select(playlistId)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      playlistsApi.util.upsertQueryData("getPlaylist", playlistId, data),
    );
  }, [dispatch, playlistId, data, cachedData]);
  return null;
}

export function EditPlaylistPageView(): ReactElement {
  const params = useParams<{ id: string }>();
  const { state, contentLibrary, handleCancel, handleSave, isSaving } =
    useEditPlaylistPage(params?.id);

  // Form state owned here so canSave is computed during render with no effects.
  const [loadedPlaylistId, setLoadedPlaylistId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [showCounter, setShowCounter] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);

  // React-approved "adjust state during render" pattern (replaces reset useEffect).
  // Fires once per playlist load; React immediately re-renders with the new values.
  if (state.status === "ready" && state.playlist.id !== loadedPlaylistId) {
    setLoadedPlaylistId(state.playlist.id);
    setName(state.playlist.name);
    setDesc(state.playlist.description ?? "");
    setShowCounter(state.playlist.showCounter ?? false);
    setItems(toDrafts(state.playlist.items));
  }

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);
  const isOverDurationLimit = totalDuration > MAX_BASE_DURATION_SECONDS;
  const canSave =
    !isSaving &&
    name.trim().length > 0 &&
    items.length > 0 &&
    !isOverDurationLimit;

  const handleSaveClick = useCallback(() => {
    const snapshot: PlaylistItemsAtomicSnapshot = items.map((item) =>
      item.id.startsWith("draft-")
        ? {
            kind: "new",
            contentId: item.content.id,
            duration: item.duration,
            loop: item.loop,
          }
        : {
            kind: "existing",
            itemId: item.id,
            duration: item.duration,
            loop: item.loop,
          },
    );

    void handleSave({
      metadata: {
        name: name.trim(),
        description: desc.trim() || null,
        showCounter,
      },
      items: snapshot,
    });
  }, [desc, handleSave, items, name, showCounter]);

  const headerActions =
    state.status === "ready" ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveClick} disabled={!canSave || isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Edit Playlist">{headerActions}</PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {state.status === "loading" ? (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
              <p className="text-muted-foreground">Loading playlist...</p>
            </div>
          ) : null}

          {state.status === "notFound" ? (
            <div className="flex min-h-0 flex-1 overflow-auto p-4">
              <EmptyState
                title="Playlist not found"
                description={state.message}
                action={
                  <Button asChild>
                    <Link href={PLAYLIST_INDEX_PATH}>Back to Playlists</Link>
                  </Button>
                }
              />
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="flex min-h-0 flex-1 overflow-auto p-4">
              <EmptyState
                title="Unable to load playlist"
                description={state.message}
                action={
                  <Button asChild>
                    <Link href={PLAYLIST_INDEX_PATH}>Back to Playlists</Link>
                  </Button>
                }
              />
            </div>
          ) : null}

          {state.status === "ready" ? (
            <div className="flex min-h-0 flex-1 overflow-auto p-4">
              <EditPlaylistForm
                name={name}
                onNameChange={setName}
                description={desc}
                onDescriptionChange={setDesc}
                showCounter={showCounter}
                onShowCounterChange={setShowCounter}
                items={items}
                onItemsChange={setItems}
                availableContent={contentLibrary.availableContent}
                contentSearch={contentLibrary.search}
                onContentSearchChange={contentLibrary.onSearchChange}
                isContentLibraryLoading={contentLibrary.isLoading}
                isContentLibraryFetching={contentLibrary.isFetching}
                hasMoreContent={contentLibrary.hasMore}
                onLoadMoreContent={contentLibrary.onLoadMore}
                isOverDurationLimit={isOverDurationLimit}
                totalDuration={totalDuration}
                isSaving={isSaving}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
