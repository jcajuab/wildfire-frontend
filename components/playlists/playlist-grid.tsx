"use client";

import type { ReactElement } from "react";
import { IconPlus } from "@tabler/icons-react";
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
        action={
          <Can permission="playlists:create">
            <Button asChild>
              <Link href="/admin/playlists/create">
                <IconPlus className="size-4" aria-hidden="true" />
                Create Playlist
              </Link>
            </Button>
          </Can>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
