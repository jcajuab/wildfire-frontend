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
 * structural changes (display registered/unregistered) still invalidate
 * the display list tag so lists refetch.
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
