"use client";

import type { ReactElement } from "react";
import Link from "next/link";

import { Can } from "@/components/common/can";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { PlaylistCard } from "./playlist-card";
import type { PlaylistSummary } from "@/types/playlist";

interface PlaylistGridProps {
  readonly playlists: readonly PlaylistSummary[];
  readonly onEdit?: (playlist: PlaylistSummary) => void;
  readonly onDelete?: (playlist: PlaylistSummary) => void;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onSelectionChange?: (
    playlist: PlaylistSummary,
    checked: boolean,
  ) => void;
}

export function PlaylistGrid({
  playlists,
  onEdit,
  onDelete,
  selectedIds,
  onSelectionChange,
}: PlaylistGridProps): ReactElement {
  if (playlists.length === 0) {
    return (
      <EmptyState
        title="No playlists yet"
        description="Create your first playlist to combine content and publish it to displays."
        action={
          <Can permission="playlists:create">
            <Button asChild>
              <Link href="/admin/playlists/create">Create Playlist</Link>
            </Button>
          </Can>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onEdit={onEdit}
          onDelete={onDelete}
          isSelected={selectedIds?.has(playlist.id) ?? false}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  );
}
