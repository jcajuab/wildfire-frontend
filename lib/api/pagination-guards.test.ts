import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("paginated aggregate query guards", () => {
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

  test("devices query stops at guard limit and returns error", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    const { devicesApi } = await import("@/lib/api/devices-api");
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: crypto.randomUUID(),
              identifier: "id",
              name: "name",
              location: null,
              ipAddress: null,
              macAddress: null,
              screenWidth: null,
              screenHeight: null,
              outputType: null,
              orientation: null,
              lastSeenAt: "2025-01-01T00:00:00.000Z",
              onlineStatus: "LIVE",
              createdAt: "2025-01-01T00:00:00.000Z",
              updatedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
          total: 9999,
          page: 1,
          pageSize: 100,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
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
      devicesApi.endpoints.getDevices.initiate(),
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatchObject({
        status: 500,
        data: "Failed to load devices: pagination limit reached.",
      });
    }
  });

  test("schedules query stops at guard limit and returns error", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    const { schedulesApi } = await import("@/lib/api/schedules-api");
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: crypto.randomUUID(),
              name: "Daily",
              playlistId: crypto.randomUUID(),
              deviceId: crypto.randomUUID(),
              startDate: "2025-01-01",
              endDate: "2025-12-31",
              startTime: "00:00",
              endTime: "23:59",
              daysOfWeek: [1],
              priority: 1,
              isActive: true,
              createdAt: "2025-01-01T00:00:00.000Z",
              updatedAt: "2025-01-01T00:00:00.000Z",
              playlist: { id: crypto.randomUUID(), name: "Playlist" },
              device: { id: crypto.randomUUID(), name: "Device" },
            },
          ],
          total: 9999,
          page: 1,
          pageSize: 100,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    const store = configureStore({
      reducer: {
        [schedulesApi.reducerPath]: schedulesApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(schedulesApi.middleware),
    });

    const result = await store.dispatch(
      schedulesApi.endpoints.listSchedules.initiate(),
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatchObject({
        status: 500,
        data: "Failed to load schedules: pagination limit reached.",
      });
    }
  });
});
