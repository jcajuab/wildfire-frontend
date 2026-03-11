"use client";

import type { ReactElement } from "react";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { CreatePlaylistForm } from "@/components/playlists/create-playlist-form";
import { useCreatePlaylistPage } from "./use-create-playlist-page";

export default function CreatePlaylistPage(): ReactElement {
  const { availableContent, handleCancel, handleCreatePlaylist } =
    useCreatePlaylistPage();

  return (
    <DashboardPage.Root>
      <DashboardPage.Header title="Create Playlist" />
      <DashboardPage.Body>
        <DashboardPage.Content>
          <CreatePlaylistForm
            availableContent={availableContent}
            onCreate={handleCreatePlaylist}
            onCancel={handleCancel}
            onSuccess={handleCancel}
            showHeader={false}
            surface="page"
          />
        </DashboardPage.Content>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
