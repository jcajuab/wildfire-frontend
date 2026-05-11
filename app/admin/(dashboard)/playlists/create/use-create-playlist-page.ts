"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  playlistsApi,
  useCreatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { type CreatePlaylistDraft } from "@/components/playlists/create-playlist-form";
import { getPlaylistItemLoop } from "@/components/playlists/playlist-form-body";
import {
  type PlaylistContentLibraryState,
  usePlaylistContentLibrary,
} from "@/components/playlists/use-playlist-content-library";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { useAppDispatch } from "@/lib/hooks";
import {
  PLAYLISTS_PAGE_SIZE,
  playlistsListQueryFromSearchParams,
} from "@/lib/playlists-search-params";

const DEFAULT_PLAYLIST_LIST_QUERY = playlistsListQueryFromSearchParams(
  {},
  PLAYLISTS_PAGE_SIZE,
);

export interface UseCreatePlaylistPageResult {
  readonly contentLibrary: PlaylistContentLibraryState;
  handleCreatePlaylist: (data: CreatePlaylistDraft) => Promise<boolean>;
  handleCancel: () => void;
}

export function useCreatePlaylistPage(): UseCreatePlaylistPageResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const contentLibrary = usePlaylistContentLibrary();

  const [createPlaylist] = useCreatePlaylistMutation();

  const handleCancel = useCallback(() => {
    router.push(PLAYLIST_INDEX_PATH);
  }, [router]);

  const handleCreatePlaylist = useCallback(
    async (data: CreatePlaylistDraft) => {
      try {
        await createPlaylist({
          name: data.name,
          description: data.description,
          showCounter: data.showCounter,
          items: data.items.map((item) => ({
            contentId: item.content.id,
            duration: item.duration,
            loop: getPlaylistItemLoop(item.content),
          })),
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

        toast.success("Successfully created playlist");
        return true;
      } catch (error) {
        notifyApiError(error, "Failed to create playlist.");
        return false;
      }
    },
    [createPlaylist, dispatch],
  );

  return {
    contentLibrary,
    handleCreatePlaylist,
    handleCancel,
  };
}
