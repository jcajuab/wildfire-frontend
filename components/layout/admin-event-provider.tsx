"use client";

import { useEffect, type ReactElement, type ReactNode } from "react";
import { handleDisplayLifecycleEvent } from "@/lib/api/admin-lifecycle-cache";
import {
  subscribeToDisplayLifecycleEvents,
  type DisplayLifecycleEvent,
} from "@/lib/api/display-events";
import { useAppDispatch, useAppStore } from "@/lib/hooks";
import { useCan } from "@/hooks/use-can";

/**
 * Persistent layout-level SSE subscription.
 *
 * Maintains a single connection to /displays/events for the entire
 * dashboard session. Status updates patch cached query data in place;
 * display registered fetches the new row and merges into lists (fallback LIST invalidate on failure);
 * display unregistered removes rows from cache and invalidates the detail tag.
 */
export function AdminEventProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const canReadDisplays = useCan("displays:read");

  useEffect(() => {
    if (!canReadDisplays) return;

    const subscription = subscribeToDisplayLifecycleEvents({
      onEvent: (event: DisplayLifecycleEvent) => {
        handleDisplayLifecycleEvent(dispatch, () => store.getState(), event);
      },
    });

    return () => subscription.close();
  }, [canReadDisplays, dispatch, store]);

  return <>{children}</>;
}
