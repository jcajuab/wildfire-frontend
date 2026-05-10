"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCan } from "@/hooks/use-can";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  playlistsApi,
  useCreatePlaylistMutation,
} from "@/lib/api/playlists-api";
import {
  type CreatePlaylistDraft,
  type PlaylistSelectableContent,
} from "@/components/playlists/create-playlist-form";
import { mapContentOptionToPlaylistSelectable } from "@/lib/playlists/map-content-option-to-selectable";
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
  readonly availableContent: readonly PlaylistSelectableContent[];
  handleCreatePlaylist: (data: CreatePlaylistDraft) => Promise<boolean>;
  handleCancel: () => void;
}

export function useCreatePlaylistPage(): UseCreatePlaylistPageResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const canReadContent = useCan("content:read");
  const { data: optionsData } = useGetContentOptionsQuery(
    PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY,
    { skip: !canReadContent },
  );

  const [createPlaylist] = useCreatePlaylistMutation();

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
      try {
        await createPlaylist({
          name: data.name,
          description: data.description,
          showCounter: data.showCounter,
          items: data.items.map((item) => ({
            contentId: item.content.id,
            duration: item.duration,
            loop: item.loop,
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
    availableContent,
    handleCreatePlaylist,
    handleCancel,
  };
}
