"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCan } from "@/hooks/use-can";
import { useListContentQuery } from "@/lib/api/content-api";
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
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import type { Content } from "@/types/content";

const isPlaylistRenderableContent = (
  content: Content,
): content is PlaylistSelectableContent =>
  content.type === "IMAGE" ||
  content.type === "VIDEO" ||
  content.type === "PDF" ||
  content.type === "TEXT";

export interface UseCreatePlaylistPageResult {
  readonly availableContent: readonly PlaylistSelectableContent[];
  handleCreatePlaylist: (data: CreatePlaylistDraft) => Promise<boolean>;
  handleCancel: () => void;
}

export function useCreatePlaylistPage(): UseCreatePlaylistPageResult {
  const router = useRouter();
  const canReadContent = useCan("content:read");
  const { data: contentData } = useListContentQuery(
    { page: 1, pageSize: 100 },
    { skip: !canReadContent },
  );

  const [createPlaylist] = useCreatePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const availableContent = useMemo(
    () =>
      (contentData?.items ?? [])
        .map(mapBackendContentToContent)
        .filter(isPlaylistRenderableContent),
    [contentData?.items],
  );

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
            })),
          }).unwrap();
        }

        toast.success("Playlist created.");
        return true;
      } catch (error) {
        if (createdPlaylistId) {
          try {
            await deletePlaylist(createdPlaylistId).unwrap();
          } catch (rollbackError) {
            console.error(
              "Failed to roll back playlist creation after item-save failure.",
              rollbackError,
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
