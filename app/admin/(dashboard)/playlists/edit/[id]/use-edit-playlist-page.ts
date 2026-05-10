"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { PlaylistEditorSavePayload } from "@/components/playlists/edit-playlist-form";
import {
  type PlaylistContentLibraryState,
  usePlaylistContentLibrary,
} from "@/components/playlists/use-playlist-content-library";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  playlistsApi,
  useLazyGetPlaylistQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { isNotFoundError } from "@/lib/api/error-guards";
import { mapBackendPlaylistWithItems } from "@/lib/mappers/playlist-mapper";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { useAppDispatch } from "@/lib/hooks";
import {
  PLAYLISTS_PAGE_SIZE,
  playlistsListQueryFromSearchParams,
} from "@/lib/playlists-search-params";
import type { PlaylistDetail } from "@/types/playlist";

const DEFAULT_PLAYLIST_LIST_QUERY = playlistsListQueryFromSearchParams(
  {},
  PLAYLISTS_PAGE_SIZE,
);

export type EditPlaylistPageState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly playlist: PlaylistDetail }
  | { readonly status: "notFound"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

export interface UseEditPlaylistPageResult {
  readonly state: EditPlaylistPageState;
  readonly contentLibrary: PlaylistContentLibraryState;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: (payload: PlaylistEditorSavePayload) => Promise<void>;
}

export function useEditPlaylistPage(
  playlistId: string | null | undefined,
): UseEditPlaylistPageResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const contentLibrary = usePlaylistContentLibrary();

  const [loadPlaylist] = useLazyGetPlaylistQuery();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const [state, setState] = useState<EditPlaylistPageState>({
    status: "loading",
  });
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

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
          showCounter: payload.metadata.showCounter,
        }).unwrap();

        try {
          await savePlaylistItemsAtomic({
            playlistId: state.playlist.id,
            items: payload.items,
          }).unwrap();
          try {
            await dispatch(
              playlistsApi.endpoints.listPlaylists.initiate(
                DEFAULT_PLAYLIST_LIST_QUERY,
                {
                  forceRefetch: true,
                  subscribe: false,
                },
              ),
            ).unwrap();
          } catch {
            // The list page has an active query and will retry on mount/focus.
          }
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
    [dispatch, router, savePlaylistItemsAtomic, state, updatePlaylist],
  );

  return {
    state,
    contentLibrary,
    isSaving,
    handleCancel,
    handleSave,
  };
}
