import { getBaseUrl } from "@/lib/api/base-query";
import type { DisplayStatus } from "@/types/display";

export type DisplayLifecycleEvent =
  | {
      readonly type: "display_registered";
      readonly displayId: string;
      readonly slug: string;
      readonly occurredAt: string;
    }
  | {
      readonly type: "display_unregistered";
      readonly displayId: string;
      readonly slug: string;
      readonly occurredAt: string;
    }
  | {
      readonly type: "display_status_changed";
      readonly displayId: string;
      readonly slug: string;
      readonly previousStatus: DisplayStatus;
      readonly status: DisplayStatus;
      readonly occurredAt: string;
    }
  | {
      readonly type: "playlist_status_changed";
      readonly playlistId: string;
      readonly status: "DRAFT" | "IN_USE";
      readonly occurredAt: string;
    };

interface EventSourceLike {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
}

type EventSourceConstructor = new (
  url: string,
  eventSourceInitDict?: EventSourceInit,
) => EventSourceLike;

export interface DisplayLifecycleSubscription {
  close(): void;
}

const DISPLAY_LIFECYCLE_EVENT_TYPES = [
  "display_registered",
  "display_unregistered",
  "display_status_changed",
  "playlist_status_changed",
] as const;

const DISPLAY_STATUS_VALUES = ["PROCESSING", "READY", "LIVE", "DOWN"] as const;
const PLAYLIST_STATUS_VALUES = ["DRAFT", "IN_USE"] as const;

const isPlaylistStatus = (v: unknown): v is "DRAFT" | "IN_USE" =>
  typeof v === "string" &&
  PLAYLIST_STATUS_VALUES.includes(v as "DRAFT" | "IN_USE");

type DisplayLifecycleEventType = (typeof DISPLAY_LIFECYCLE_EVENT_TYPES)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isDisplayStatus = (value: unknown): value is DisplayStatus =>
  typeof value === "string" &&
  DISPLAY_STATUS_VALUES.includes(value as DisplayStatus);

const isEventType = (value: unknown): value is DisplayLifecycleEventType =>
  typeof value === "string" &&
  DISPLAY_LIFECYCLE_EVENT_TYPES.includes(value as DisplayLifecycleEventType);

const readEventData = (event: Event): string | null => {
  const data = (event as { data?: unknown }).data;
  return typeof data === "string" ? data : null;
};

const parseDisplayLifecycleEvent = (
  payload: unknown,
): DisplayLifecycleEvent | null => {
  if (!isRecord(payload) || !isEventType(payload.type)) {
    return null;
  }

  if (payload.type === "playlist_status_changed") {
    if (
      typeof payload.playlistId !== "string" ||
      !isPlaylistStatus(payload.status) ||
      typeof payload.occurredAt !== "string"
    ) {
      return null;
    }
    return {
      type: "playlist_status_changed",
      playlistId: payload.playlistId,
      status: payload.status,
      occurredAt: payload.occurredAt,
    };
  }

  if (
    typeof payload.displayId !== "string" ||
    typeof payload.slug !== "string" ||
    typeof payload.occurredAt !== "string"
  ) {
    return null;
  }

  if (payload.type === "display_status_changed") {
    if (
      !isDisplayStatus(payload.previousStatus) ||
      !isDisplayStatus(payload.status)
    ) {
      return null;
    }

    return {
      type: payload.type,
      displayId: payload.displayId,
      slug: payload.slug,
      previousStatus: payload.previousStatus,
      status: payload.status,
      occurredAt: payload.occurredAt,
    };
  }

  return {
    type: payload.type,
    displayId: payload.displayId,
    slug: payload.slug,
    occurredAt: payload.occurredAt,
  };
};

export function subscribeToDisplayLifecycleEvents(input: {
  readonly onEvent: (event: DisplayLifecycleEvent) => void;
  readonly baseUrl?: string;
  readonly eventSource?: EventSourceConstructor;
}): DisplayLifecycleSubscription {
  const EventSourceImpl = input.eventSource ?? globalThis.EventSource;
  if (typeof EventSourceImpl !== "function") {
    throw new Error("EventSource is not available in this environment.");
  }

  const stream = new EventSourceImpl(
    `${input.baseUrl ?? getBaseUrl()}/displays/events`,
    {
      withCredentials: true,
    },
  );

  const handleEvent = (event: Event) => {
    const rawData = readEventData(event);
    if (rawData == null) {
      return;
    }

    try {
      const parsed = parseDisplayLifecycleEvent(JSON.parse(rawData));
      if (parsed) {
        input.onEvent(parsed);
      }
    } catch {
      // Ignore malformed SSE payloads to keep the stream resilient.
    }
  };

  for (const eventType of DISPLAY_LIFECYCLE_EVENT_TYPES) {
    stream.addEventListener(eventType, handleEvent);
  }

  return {
    close() {
      for (const eventType of DISPLAY_LIFECYCLE_EVENT_TYPES) {
        stream.removeEventListener(eventType, handleEvent);
      }
      stream.close();
    },
  };
}
