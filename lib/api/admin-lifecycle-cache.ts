import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { contentApi } from "@/lib/api/content-api";
import {
  mergeEnrichedContentIntoCaches,
  patchContentStatusInCaches,
} from "@/lib/api/merge-enriched-content-into-caches";
import type { DisplayLifecycleEvent } from "@/lib/api/display-events";
import type { BackendDisplay } from "@/lib/api/displays-api";
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
    case "display_registered": {
      void dispatch(displaysApi.endpoints.getDisplay.initiate(event.displayId))
        .unwrap()
        .then((display) => {
          const latest = getState();
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            latest,
            "getDisplaysBootstrap",
          );
          for (const args of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                args,
                (draft) => {
                  patchPaginatedListById(draft.displays, "add", display, {
                    position: "start",
                  });
                },
              ),
            );
          }
          const displayListArgs = displaysApi.util.selectCachedArgsForQuery(
            latest,
            "getDisplays",
          );
          for (const args of displayListArgs) {
            dispatch(
              displaysApi.util.updateQueryData("getDisplays", args, (draft) => {
                patchPaginatedListById(draft, "add", display, {
                  position: "start",
                });
              }),
            );
          }
        })
        .catch(() => {
          dispatch(api.util.invalidateTags([{ type: "Display", id: "LIST" }]));
        });
      return;
    }

    case "display_unregistered": {
      const stub = { id: event.displayId } as BackendDisplay;
      const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
        state,
        "getDisplaysBootstrap",
      );
      for (const args of bootstrapArgs) {
        dispatch(
          displaysApi.util.updateQueryData(
            "getDisplaysBootstrap",
            args,
            (draft) => {
              patchPaginatedListById(draft.displays, "remove", stub);
            },
          ),
        );
      }

      const displayListArgs = displaysApi.util.selectCachedArgsForQuery(
        state,
        "getDisplays",
      );
      for (const args of displayListArgs) {
        dispatch(
          displaysApi.util.updateQueryData("getDisplays", args, (draft) => {
            patchPaginatedListById(draft, "remove", stub);
          }),
        );
      }

      dispatch(
        api.util.invalidateTags([{ type: "Display", id: event.displayId }]),
      );
      return;
    }

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
                  d.id === event.displayId ? { ...d, status: event.status } : d,
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
              p.id === event.playlistId ? { ...p, status: event.status } : p,
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
      if (event.status === "READY") {
        void dispatch(
          contentApi.endpoints.getContent.initiate(event.contentId, {
            forceRefetch: true,
          }),
        )
          .unwrap()
          .then((full) => {
            mergeEnrichedContentIntoCaches(dispatch, getState, full);
          })
          .catch(() => {
            patchContentStatusInCaches(
              dispatch,
              getState,
              event.contentId,
              "READY",
            );
          });
        return;
      }

      patchContentStatusInCaches(
        dispatch,
        getState,
        event.contentId,
        event.status,
      );
      return;
    }
  }
}
