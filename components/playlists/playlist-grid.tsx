"use client";

import type { ReactElement } from "react";
import { IconPlaylist } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PlaylistCard } from "./playlist-card";
import type { PlaylistSummary } from "@/types/playlist";

interface PlaylistGridProps {
  readonly playlists: readonly PlaylistSummary[];
  readonly onEdit?: (playlist: PlaylistSummary) => void;
  readonly onDelete?: (playlist: PlaylistSummary) => void;
}

export function PlaylistGrid({
  playlists,
  onEdit,
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
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
