export interface DisplaySseClientOptions {
  readonly streamUrl: string;
  readonly getHeaders: () => Promise<Record<string, string>>;
  readonly onEvent: (eventType: string, rawData: string) => void;
  readonly onStateChange?: (
    state: "connected" | "reconnecting" | "closed",
  ) => void;
}

export interface DisplaySseClient {
  readonly close: () => void;
}

const jitterMs = (attempt: number): number => {
  const base = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
  return base + Math.floor(Math.random() * 250);
};

const parseSseEvent = (
  rawBlock: string,
): { eventType: string; data: string } | null => {
  const lines = rawBlock.split("\n");
  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    eventType,
    data: dataLines.join("\n"),
  };
};

export const createDisplaySseClient = (
  options: DisplaySseClientOptions,
): DisplaySseClient => {
  let closed = false;
  let retryAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

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
    controller?.abort();
    controller = new AbortController();

    try {
      const headers = await options.getHeaders();
      const response = await fetch(options.streamUrl, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...headers,
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed (${response.status})`);
      }

      retryAttempt = 0;
      options.onStateChange?.("connected");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder
          .decode(value, { stream: true })
          .replaceAll("\r\n", "\n");

        while (true) {
          const boundary = buffer.indexOf("\n\n");
          if (boundary === -1) {
            break;
          }

          const block = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          if (!block) {
            continue;
          }

          const parsed = parseSseEvent(block);
          if (parsed) {
            options.onEvent(parsed.eventType, parsed.data);
          }
        }
      }

      if (!closed) {
        scheduleReconnect();
      }
    } catch {
      if (!closed) {
        scheduleReconnect();
      }
    }
  };

  void connect();

  return {
    close() {
      closed = true;
      clearReconnect();
      controller?.abort();
      controller = null;
      options.onStateChange?.("closed");
    },
  };
};
