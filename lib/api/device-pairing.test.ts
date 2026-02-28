import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("device pairing API", () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  test("registerDevice sends pairingCode in request body", async () => {
    const { devicesApi } = await import("@/lib/api/devices-api");
    let capturedBody = "";
    let capturedHeaders: HeadersInit | undefined;

    global.fetch = vi.fn(async (_input, init) => {
      capturedBody = String(init?.body ?? "");
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          data: {
            id: "device-1",
            identifier: "display-01",
            name: "Lobby",
            location: null,
            ipAddress: null,
            macAddress: null,
            screenWidth: null,
            screenHeight: null,
            outputType: null,
            orientation: null,
            lastSeenAt: "2025-01-01T00:00:00.000Z",
            onlineStatus: "DOWN",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const store = configureStore({
      reducer: {
        [devicesApi.reducerPath]: devicesApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(devicesApi.middleware),
    });

    const result = await store.dispatch(
      devicesApi.endpoints.registerDevice.initiate({
        pairingCode: "123456",
        identifier: "display-01",
        name: "Lobby",
        screenWidth: 1366,
        screenHeight: 768,
      }),
    );
    expect("error" in result).toBe(false);
    expect(capturedBody).toContain('"pairingCode":"123456"');
    expect(capturedBody).toContain('"screenWidth":1366');
    expect(capturedBody).toContain('"screenHeight":768');
    expect(capturedBody).not.toContain("apiKey");
    const headers = new Headers(capturedHeaders);
    expect(headers.has("x-api-key")).toBe(false);
  });
});
