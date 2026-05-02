"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  PlaylistEditorSavePayload,
  PlaylistSelectableContent,
} from "@/components/playlists/edit-playlist-form";
import { useCan } from "@/hooks/use-can";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  useLazyGetPlaylistQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { isNotFoundError } from "@/lib/api/error-guards";
import { mapContentOptionToPlaylistSelectable } from "@/lib/playlists/map-content-option-to-selectable";
import { mapBackendPlaylistWithItems } from "@/lib/mappers/playlist-mapper";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import type { PlaylistDetail } from "@/types/playlist";

export type EditPlaylistPageState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly playlist: PlaylistDetail }
  | { readonly status: "notFound"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

export interface UseEditPlaylistPageResult {
  readonly state: EditPlaylistPageState;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: (payload: PlaylistEditorSavePayload) => Promise<void>;
}

export function useEditPlaylistPage(
  playlistId: string | null | undefined,
): UseEditPlaylistPageResult {
  const router = useRouter();
  const canReadContent = useCan("content:read");

  const { data: optionsData } = useGetContentOptionsQuery(
    PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY,
    { skip: !canReadContent },
  );

  const [loadPlaylist] = useLazyGetPlaylistQuery();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const [state, setState] = useState<EditPlaylistPageState>({
    status: "loading",
  });
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const availableContent = useMemo(() => {
    const rows: PlaylistSelectableContent[] = [];
    for (const opt of optionsData ?? []) {
      const row = mapContentOptionToPlaylistSelectable(opt);
      if (row) rows.push(row);
    }
    return rows;
  }, [optionsData]);

  useEffect(() => {
    let isCancelled = false;

    if (!playlistId) {
      setState({
        status: "notFound",
        message: "The requested resource was not found.",
      });
      return () => {
        isCancelled = true;
      };
    }

    setState({ status: "loading" });

    void loadPlaylist(playlistId, true)
      .unwrap()
      .then((playlist) => {
        if (isCancelled) {
          return;
        }

        setState({
          status: "ready",
          playlist: mapBackendPlaylistWithItems(playlist),
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        if (isNotFoundError(error)) {
          setState({
            status: "notFound",
            message: getApiErrorMessage(
              error,
              "The requested resource was not found.",
            ),
          });
          return;
        }

        setState({
          status: "error",
          message: getApiErrorMessage(error, "Failed to load playlist items."),
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [loadPlaylist, playlistId]);

  const handleCancel = useCallback(() => {
    router.push(PLAYLIST_INDEX_PATH);
  }, [router]);

  const handleSave = useCallback(
    async (payload: PlaylistEditorSavePayload) => {
      if (isSavingRef.current || state.status !== "ready") {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        await updatePlaylist({
          id: state.playlist.id,
          name: payload.metadata.name,
          description: payload.metadata.description,
        }).unwrap();

        try {
          await savePlaylistItemsAtomic({
            playlistId: state.playlist.id,
            items: payload.items,
          }).unwrap();
          toast.success("Successfully updated playlist");
          router.push(PLAYLIST_INDEX_PATH);
        } catch (error) {
          notifyApiError(
            error,
            "Playlist info saved, but item changes failed. Review items and save again.",
          );
        }
      } catch (error) {
        notifyApiError(error, "Failed to update playlist info.");
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [router, savePlaylistItemsAtomic, state, updatePlaylist],
  );

  return {
    state,
    availableContent,
    isSaving,
    handleCancel,
    handleSave,
  };
}
