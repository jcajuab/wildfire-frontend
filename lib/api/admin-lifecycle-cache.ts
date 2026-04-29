import { api } from "@/lib/api/api";
import { contentApi } from "@/lib/api/content-api";
import type { DisplayLifecycleEvent } from "@/lib/api/display-events";
import { displaysApi } from "@/lib/api/displays-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import type { AppDispatch, RootState } from "@/lib/store";

/**
 * Applies SSE lifecycle updates by patching RTK Query cache in place instead of
 * invalidating broad tags (which forced refetches and server-cache misses).
 */
export function handleDisplayLifecycleEvent(
  dispatch: AppDispatch,
  getState: () => RootState,
  event: DisplayLifecycleEvent,
): void {
  const state = getState();

  switch (event.type) {
    case "display_registered":
    case "display_unregistered":
      dispatch(api.util.invalidateTags([{ type: "Display", id: "LIST" }]));
      return;

    case "display_status_changed": {
      const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
        state,
        "getDisplaysBootstrap",
      );
      for (const args of bootstrapArgs) {
        dispatch(
          displaysApi.util.updateQueryData(
            "getDisplaysBootstrap",
            args,
            (draft) => ({
              ...draft,
              displays: {
                ...draft.displays,
                items: draft.displays.items.map((d) =>
                  d.id === event.displayId
                    ? { ...d, status: event.status }
                    : d,
                ),
              },
            }),
          ),
        );
      }

      const displayListArgs = displaysApi.util.selectCachedArgsForQuery(
        state,
        "getDisplays",
      );
      for (const args of displayListArgs) {
        dispatch(
          displaysApi.util.updateQueryData("getDisplays", args, (draft) => ({
            ...draft,
            items: draft.items.map((d) =>
              d.id === event.displayId ? { ...d, status: event.status } : d,
            ),
          })),
        );
      }

      dispatch(
        displaysApi.util.updateQueryData(
          "getDisplay",
          event.displayId,
          (draft) => ({ ...draft, status: event.status }),
        ),
      );
      return;
    }

    case "playlist_status_changed": {
      const playlistListArgs = playlistsApi.util.selectCachedArgsForQuery(
        state,
        "listPlaylists",
      );
      for (const args of playlistListArgs) {
        dispatch(
          playlistsApi.util.updateQueryData("listPlaylists", args, (draft) => ({
            ...draft,
            items: draft.items.map((p) =>
              p.id === event.playlistId
                ? { ...p, status: event.status }
                : p,
            ),
          })),
        );
      }

      dispatch(
        playlistsApi.util.updateQueryData(
          "getPlaylist",
          event.playlistId,
          (draft) => ({ ...draft, status: event.status }),
        ),
      );
      return;
    }

    case "content_status_changed": {
      const contentListArgs = contentApi.util.selectCachedArgsForQuery(
        state,
        "listContent",
      );
      for (const args of contentListArgs) {
        dispatch(
          contentApi.util.updateQueryData("listContent", args, (draft) => ({
            ...draft,
            items: draft.items.map((c) =>
              c.id === event.contentId
                ? { ...c, status: event.status }
                : c,
            ),
          })),
        );
      }

      dispatch(
        contentApi.util.updateQueryData(
          "getContent",
          event.contentId,
          (draft) => ({ ...draft, status: event.status }),
        ),
      );
      return;
    }
  }
}
