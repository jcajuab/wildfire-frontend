"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { EditPlaylistForm } from "@/components/playlists/edit-playlist-form";
import { Button } from "@/components/ui/button";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { useEditPlaylistPage } from "./use-edit-playlist-page";

interface EditPlaylistPageFormState {
  readonly canSave: boolean;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
}

export default function EditPlaylistPage(): ReactElement {
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
    <DashboardPage.Root>
      <DashboardPage.Header title="Edit Playlist" actions={headerActions} />
      <DashboardPage.Body>
        <DashboardPage.Content>
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
        </DashboardPage.Content>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
