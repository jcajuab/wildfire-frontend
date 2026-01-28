"use client";

import { PlaylistCard } from "./playlist-card";
import type { Playlist } from "@/types/playlist";

interface PlaylistGridProps {
  readonly playlists: readonly Playlist[];
  readonly onEdit?: (playlist: Playlist) => void;
  readonly onPreview?: (playlist: Playlist) => void;
  readonly onDelete?: (playlist: Playlist) => void;
}

export function PlaylistGrid({
  playlists,
  onEdit,
  onPreview,
  onDelete,
}: PlaylistGridProps): React.ReactElement {
  if (playlists.length === 0) {
    return <div className="flex-1" />;
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
        />
      ))}
    </div>
  );
}
