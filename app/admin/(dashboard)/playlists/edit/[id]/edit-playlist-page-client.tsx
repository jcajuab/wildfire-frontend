"use client";

import type { ReactElement } from "react";
import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { EditPlaylistForm } from "@/components/playlists/edit-playlist-form";
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

interface EditPlaylistPageFormState {
  readonly canSave: boolean;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
}

export function EditPlaylistPageView(): ReactElement {
  const params = useParams<{ id: string }>();
  const { state, availableContent, handleCancel, handleSave, isSaving } =
    useEditPlaylistPage(params?.id);
  const [formState, setFormState] = useState<EditPlaylistPageFormState | null>(
    null,
  );

  const headerActions =
    state.status === "ready" ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => formState?.handleCancel()}
          disabled={formState?.isSaving ?? false}
        >
          Cancel
        </Button>
        <Button
          onClick={() => formState?.handleSave()}
          disabled={!formState?.canSave || formState.isSaving}
        >
          {formState?.isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Edit Playlist">{headerActions}</PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {state.status === "loading" ? (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-6 sm:px-8 sm:py-8">
              <p className="text-muted-foreground">Loading playlist...</p>
            </div>
          ) : null}

          {state.status === "notFound" ? (
            <div className="flex min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
            <div className="flex min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
            <div className="flex min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
              <EditPlaylistForm
                playlist={state.playlist}
                availableContent={availableContent}
                onSave={handleSave}
                onCancel={handleCancel}
                onStateChange={setFormState}
                isSaving={isSaving}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
