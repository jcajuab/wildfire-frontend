"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { mapBackendPlaylistWithItems } from "@/lib/mappers/playlist-mapper";
import type { Playlist, PlaylistItem } from "@/types/playlist";
import type { PlaylistItemsAtomicSnapshot } from "@/components/playlists/edit-playlist-items-dialog";

export interface NewPlaylistPayload {
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number;
}

export function usePlaylistsHandlers({
  editPlaylist,
  editName,
  editDescription,
  setEditPlaylist,
  setPreviewPlaylist,
  setManageItemsPlaylist,
  handleManageItemsDialogOpenChange,
}: {
  editPlaylist: Playlist | null;
  editName: string;
  editDescription: string;
  setEditPlaylist: (playlist: Playlist | null) => void;
  setPreviewPlaylist: (playlist: Playlist | null) => void;
  setManageItemsPlaylist: (playlist: Playlist | null) => void;
  handleManageItemsDialogOpenChange: (open: boolean) => void;
}) {
  const [isSavingPlaylistItems, setIsSavingPlaylistItems] = useState(false);
  const isSavingPlaylistItemsRef = useRef(false);

  const [loadPlaylist] = useLazyGetPlaylistQuery();
  const [createPlaylist] = useCreatePlaylistMutation();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const handleCreatePlaylist = useCallback(
    async (data: NewPlaylistPayload) => {
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
      } catch (err) {
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
        notifyApiError(err, "Failed to create playlist.");
        return false;
      }
    },
    [createPlaylist, deletePlaylist, savePlaylistItemsAtomic],
  );

  const handleManageItems = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setManageItemsPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch (err) {
        notifyApiError(err, "Failed to load playlist items.");
      }
    },
    [loadPlaylist, setManageItemsPlaylist],
  );

  const handleSaveItems = useCallback(
    async (playlistId: string, items: PlaylistItemsAtomicSnapshot) => {
      if (isSavingPlaylistItemsRef.current) {
        return;
      }

      isSavingPlaylistItemsRef.current = true;
      setIsSavingPlaylistItems(true);

      try {
        await savePlaylistItemsAtomic({
          playlistId,
          items,
        }).unwrap();
        toast.success("Playlist items updated.");
        handleManageItemsDialogOpenChange(false);
      } catch (err) {
        notifyApiError(err, "Failed to update playlist items.");
      } finally {
        isSavingPlaylistItemsRef.current = false;
        setIsSavingPlaylistItems(false);
      }
    },
    [handleManageItemsDialogOpenChange, savePlaylistItemsAtomic],
  );

  const handlePreviewPlaylist = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setPreviewPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch {
        setPreviewPlaylist(playlist);
      }
    },
    [loadPlaylist, setPreviewPlaylist],
  );

  const handleUpdatePlaylist = useCallback(async () => {
    if (!editPlaylist || editName.trim().length === 0) return;
    try {
      await updatePlaylist({
        id: editPlaylist.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
      }).unwrap();
      setEditPlaylist(null);
      toast.success("Playlist updated.");
    } catch (err) {
      notifyApiError(err, "Failed to update playlist.");
    }
  }, [
    editPlaylist,
    editName,
    editDescription,
    updatePlaylist,
    setEditPlaylist,
  ]);

  const deletePlaylistMutation = useCallback(
    async (id: string) => {
      await deletePlaylist(id).unwrap();
    },
    [deletePlaylist],
  );

  return {
    isSavingPlaylistItems,
    handleCreatePlaylist,
    handleManageItems,
    handleSaveItems,
    handlePreviewPlaylist,
    handleUpdatePlaylist,
    deletePlaylistMutation,
  };
}
