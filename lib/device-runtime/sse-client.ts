export interface DeviceStreamToken {
  readonly token: string;
  readonly expiresAt: string;
}

export interface DeviceSseClientOptions {
  readonly streamUrl: string;
  readonly getToken: () => Promise<DeviceStreamToken>;
  readonly onEvent: (eventType: string, rawData: string) => void;
  readonly onStateChange?: (
    state: "connected" | "reconnecting" | "closed",
  ) => void;
}

export interface DeviceSseClient {
  readonly close: () => void;
}

const jitterMs = (attempt: number): number => {
  const base = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
  return base + Math.floor(Math.random() * 250);
};

export const createDeviceSseClient = (
  options: DeviceSseClientOptions,
): DeviceSseClient => {
  let closed = false;
  let retryAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let source: EventSource | null = null;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    options.onStateChange?.("reconnecting");
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      void connect();
    }, jitterMs(retryAttempt));
    retryAttempt += 1;
  };

  const connect = async () => {
    if (closed) return;
    try {
      const token = await options.getToken();
      const separator = options.streamUrl.includes("?") ? "&" : "?";
      source = new EventSource(
        `${options.streamUrl}${separator}streamToken=${encodeURIComponent(token.token)}`,
      );
      source.onopen = () => {
        retryAttempt = 0;
        options.onStateChange?.("connected");
      };
      source.onerror = () => {
        source?.close();
        source = null;
        scheduleReconnect();
      };
      source.onmessage = (event) => {
        options.onEvent("message", event.data);
      };
      source.addEventListener("manifest_updated", (event: MessageEvent) => {
        options.onEvent("manifest_updated", event.data);
      });
      source.addEventListener("schedule_updated", (event: MessageEvent) => {
        options.onEvent("schedule_updated", event.data);
      });
      source.addEventListener("playlist_updated", (event: MessageEvent) => {
        options.onEvent("playlist_updated", event.data);
      });
      source.addEventListener(
        "device_refresh_requested",
        (event: MessageEvent) => {
          options.onEvent("device_refresh_requested", event.data);
        },
      );
    } catch {
      scheduleReconnect();
    }
  };

  void connect();

  return {
    close() {
      closed = true;
      clearReconnect();
      source?.close();
      source = null;
      options.onStateChange?.("closed");
    },
  };
};
