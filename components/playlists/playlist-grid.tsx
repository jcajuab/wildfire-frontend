"use client";

import type { ReactElement } from "react";
import { IconPlaylist } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PlaylistCard } from "./playlist-card";
import type { Playlist } from "@/types/playlist";

interface PlaylistGridProps {
  readonly playlists: readonly Playlist[];
  readonly onEdit?: (playlist: Playlist) => void;
  readonly onManageItems?: (playlist: Playlist) => void;
  readonly onPreview?: (playlist: Playlist) => void;
  readonly onDelete?: (playlist: Playlist) => void;
}

export function PlaylistGrid({
  playlists,
  onEdit,
  onManageItems,
  onPreview,
  onDelete,
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
    <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,24rem))] gap-4">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onEdit={onEdit}
          onManageItems={onManageItems}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
