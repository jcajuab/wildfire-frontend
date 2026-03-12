"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { CreatePlaylistForm } from "@/components/playlists/create-playlist-form";
import { Button } from "@/components/ui/button";
import { useCreatePlaylistPage } from "./use-create-playlist-page";

export default function CreatePlaylistPage(): ReactElement {
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
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Create Playlist"
        actions={
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
        }
      />
      <DashboardPage.Body>
        <DashboardPage.Content>
          <CreatePlaylistForm
            availableContent={availableContent}
            onCreate={handleCreatePlaylist}
            onCancel={handleCancel}
            onSuccess={handleCancel}
            showHeader={false}
            surface="page"
            onStateChange={setFormState}
          />
        </DashboardPage.Content>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
