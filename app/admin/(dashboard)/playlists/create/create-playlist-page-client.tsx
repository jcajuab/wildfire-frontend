"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CreatePlaylistForm } from "@/components/playlists/create-playlist-form";
import { Button } from "@/components/ui/button";
import { useCreatePlaylistPage } from "./use-create-playlist-page";

export function CreatePlaylistPageView(): ReactElement {
  const { availableContent, handleCancel, handleCreatePlaylist } =
    useCreatePlaylistPage();
  const [formState, setFormState] = useState<{
    canCreate: boolean;
    isSubmitting: boolean;
    handleCancel: () => void;
    handleCreate: () => Promise<void>;
  } | null>(null);

  const createLabel = formState?.isSubmitting ? "Creating..." : "Create";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Create Playlist">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => formState?.handleCancel()}
            disabled={formState?.isSubmitting ?? false}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void formState?.handleCreate();
            }}
            disabled={!formState?.canCreate || formState.isSubmitting}
          >
            {createLabel}
          </Button>
        </div>
      </PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CreatePlaylistForm
            availableContent={availableContent}
            onCreate={handleCreatePlaylist}
            onCancel={handleCancel}
            onSuccess={handleCancel}
            showHeader={false}
            surface="page"
            onStateChange={setFormState}
          />
        </div>
      </section>
    </div>
  );
}
