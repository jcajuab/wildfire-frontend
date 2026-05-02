"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCan } from "@/hooks/use-can";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useSavePlaylistItemsAtomicMutation,
} from "@/lib/api/playlists-api";
import {
  type CreatePlaylistDraft,
  type PlaylistSelectableContent,
} from "@/components/playlists/create-playlist-form";
import { mapContentOptionToPlaylistSelectable } from "@/lib/playlists/map-content-option-to-selectable";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
export interface UseCreatePlaylistPageResult {
  readonly availableContent: readonly PlaylistSelectableContent[];
  handleCreatePlaylist: (data: CreatePlaylistDraft) => Promise<boolean>;
  handleCancel: () => void;
}

export function useCreatePlaylistPage(): UseCreatePlaylistPageResult {
  const router = useRouter();
  const canReadContent = useCan("content:read");
  const { data: optionsData } = useGetContentOptionsQuery(
    PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY,
    { skip: !canReadContent },
  );

  const [createPlaylist] = useCreatePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const availableContent = useMemo(() => {
    const rows: PlaylistSelectableContent[] = [];
    for (const opt of optionsData ?? []) {
      const row = mapContentOptionToPlaylistSelectable(opt);
      if (row) rows.push(row);
    }
    return rows;
  }, [optionsData]);

  const handleCancel = useCallback(() => {
    router.push(PLAYLIST_INDEX_PATH);
  }, [router]);

  const handleCreatePlaylist = useCallback(
    async (data: CreatePlaylistDraft) => {
      let createdPlaylistId: string | null = null;

      try {
        const created = await createPlaylist({
          name: data.name,
          description: data.description,
        }).unwrap();
        createdPlaylistId = created.id;

        if (data.items.length > 0) {
          await savePlaylistItemsAtomic({
            playlistId: created.id,
            items: data.items.map((item) => ({
              kind: "new" as const,
              contentId: item.content.id,
              duration: item.duration,
              loop: item.loop,
            })),
          }).unwrap();
        }

        toast.success("Successfully created playlist");
        return true;
      } catch (error) {
        if (createdPlaylistId) {
          try {
            await deletePlaylist(createdPlaylistId).unwrap();
          } catch {
            toast.error(
              "Failed to roll back playlist creation after item-save failure.",
            );
          }
        }

        notifyApiError(error, "Failed to create playlist.");
        return false;
      }
    },
    [createPlaylist, deletePlaylist, savePlaylistItemsAtomic],
  );

  return {
    availableContent,
    handleCreatePlaylist,
    handleCancel,
  };
}
