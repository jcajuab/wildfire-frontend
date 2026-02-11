"use client";

import type { ReactElement } from "react";
import { IconPlaylist } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PlaylistCard } from "./playlist-card";
import type { Playlist } from "@/types/playlist";

interface PlaylistGridProps {
  readonly playlists: readonly Playlist[];
  readonly onEdit?: (playlist: Playlist) => void;
  readonly onPreview?: (playlist: Playlist) => void;
  readonly onDelete?: (playlist: Playlist) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function PlaylistGrid({
  playlists,
  onEdit,
  onPreview,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: PlaylistGridProps): ReactElement {
  if (playlists.length === 0) {
    return (
      <EmptyState
        title="No playlists yet"
        description="Create your first playlist to combine content and publish it to displays."
        icon={<IconPlaylist className="size-7" aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={onDelete}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
