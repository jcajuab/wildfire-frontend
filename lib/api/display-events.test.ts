import { describe, expect, test, vi } from "vitest";
import {
  subscribeToDisplayLifecycleEvents,
  type DisplayLifecycleEvent,
} from "./display-events";

type EventListener = (event: Event) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly close = vi.fn();
  readonly listeners = new Map<string, Set<EventListener>>();

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, payload: unknown): void {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    const event = {
      data: JSON.stringify(payload),
    } as Event;

    for (const listener of listeners) {
      listener(event);
    }
  }
}

describe("subscribeToDisplayLifecycleEvents", () => {
  test("dispatches register, unregister, and status change events through one callback", () => {
    MockEventSource.instances = [];
    const onEvent = vi.fn<(event: DisplayLifecycleEvent) => void>();

    const subscription = subscribeToDisplayLifecycleEvents({
      baseUrl: "http://example.test/api/v1",
      eventSource: MockEventSource as unknown as new (
        url: string,
        eventSourceInitDict?: EventSourceInit,
      ) => EventSource,
      onEvent,
    });

    const source = MockEventSource.instances[0];
    expect(source?.url).toBe("http://example.test/api/v1/displays/events");
    expect(source?.options).toEqual({ withCredentials: true });

    source?.emit("display_registered", {
      type: "display_registered",
      displayId: "display-1",
      slug: "lobby-display",
      occurredAt: "2026-03-07T00:00:00.000Z",
    });
    source?.emit("display_status_changed", {
      type: "display_status_changed",
      displayId: "display-1",
      slug: "lobby-display",
      previousStatus: "READY",
      status: "LIVE",
      occurredAt: "2026-03-07T00:05:00.000Z",
    });
    source?.emit("display_unregistered", {
      type: "display_unregistered",
      displayId: "display-1",
      slug: "lobby-display",
      occurredAt: "2026-03-07T00:10:00.000Z",
    });

    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual([
      "display_registered",
      "display_status_changed",
      "display_unregistered",
    ]);

    subscription.close();
    expect(source?.close).toHaveBeenCalledTimes(1);
  });
});
