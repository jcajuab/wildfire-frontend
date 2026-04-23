"use client";

import { useEffect, type ReactElement, type ReactNode } from "react";
import {
  subscribeToDisplayLifecycleEvents,
  type DisplayLifecycleEvent,
} from "@/lib/api/display-events";
import { useAppDispatch } from "@/lib/hooks";
import { useCan } from "@/hooks/use-can";
import { api } from "@/lib/api/api";

/**
 * Persistent layout-level SSE subscription.
 *
 * Maintains a single connection to /displays/events for the entire
 * dashboard session. On any lifecycle event, the relevant RTK Query
 * cache tags are invalidated so pages receive fresh data without
 * per-page subscriptions or polling.
 */
export function AdminEventProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const dispatch = useAppDispatch();
  const canReadDisplays = useCan("displays:read");

  useEffect(() => {
    if (!canReadDisplays) return;

    const subscription = subscribeToDisplayLifecycleEvents({
      onEvent: (event: DisplayLifecycleEvent) => {
        switch (event.type) {
          case "display_registered":
          case "display_unregistered":
          case "display_status_changed":
            dispatch(
              api.util.invalidateTags([
                { type: "Display", id: "LIST" },
              ]),
            );
            break;
          case "playlist_status_changed":
            dispatch(
              api.util.invalidateTags([
                { type: "Playlist", id: "LIST" },
                { type: "Playlist", id: event.playlistId },
              ]),
            );
            break;
          case "content_status_changed":
            dispatch(
              api.util.invalidateTags([
                { type: "Content", id: "LIST" },
                { type: "Content", id: event.contentId },
              ]),
            );
            break;
        }
      },
    });

    return () => subscription.close();
  }, [canReadDisplays, dispatch]);

  return <>{children}</>;
}
