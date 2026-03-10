import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("server-driven list query contracts", () => {
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

  test("displays query forwards server-driven filters and pagination", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    const { displaysApi } = await import("@/lib/api/displays-api");
    const selectedGroupIds = [
      crypto.randomUUID(),
      crypto.randomUUID(),
    ] as const;
    global.fetch = vi.fn(async (input) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("pageSize")).toBe("20");
      expect(url.searchParams.get("q")).toBe("lobby");
      expect(url.searchParams.get("status")).toBe("READY");
      expect(url.searchParams.get("output")).toBe("HDMI");
      expect(url.searchParams.get("sortBy")).toBe("status");
      expect(url.searchParams.get("sortDirection")).toBe("desc");
      expect(url.searchParams.getAll("groupIds")).toEqual([
        ...selectedGroupIds,
      ]);
      return new Response(
        JSON.stringify({
          data: [
            {
              id: crypto.randomUUID(),
              slug: "display-1",
              name: "name",
              location: null,
              ipAddress: null,
              macAddress: null,
              screenWidth: null,
              screenHeight: null,
              output: null,
              orientation: null,
              lastSeenAt: "2025-01-01T00:00:00.000Z",
              status: "LIVE",
              createdAt: "2025-01-01T00:00:00.000Z",
              updatedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
          meta: {
            total: 1,
            page: 2,
            pageSize: 20,
            totalPages: 1,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    const store = configureStore({
      reducer: {
        [displaysApi.reducerPath]: displaysApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(displaysApi.middleware),
    });

    const result = await store.dispatch(
      displaysApi.endpoints.getDisplays.initiate({
        page: 2,
        pageSize: 20,
        q: "lobby",
        status: "READY",
        output: "HDMI",
        sortBy: "status",
        sortDirection: "desc",
        groupIds: selectedGroupIds,
      }),
    );
    const data = "data" in result ? result.data : undefined;
    if (!data) {
      throw new Error("Expected paged display data");
    }
    expect(data.items).toHaveLength(1);
    expect(data.page).toBe(2);
  });

  test("schedules query calls the window endpoint", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    const { schedulesApi } = await import("@/lib/api/schedules-api");
    global.fetch = vi.fn(async (input) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);
      expect(url.pathname.endsWith("/schedules/window")).toBe(true);
      expect(url.searchParams.get("from")).toBe("2025-01-01");
      expect(url.searchParams.get("to")).toBe("2025-01-07");
      return new Response(
        JSON.stringify({
          data: [
            {
              id: crypto.randomUUID(),
              name: "Daily",
              playlistId: crypto.randomUUID(),
              displayId: crypto.randomUUID(),
              startDate: "2025-01-01",
              endDate: "2025-12-31",
              startTime: "00:00",
              endTime: "23:59",
              isActive: true,
              createdAt: "2025-01-01T00:00:00.000Z",
              updatedAt: "2025-01-01T00:00:00.000Z",
              playlist: { id: crypto.randomUUID(), name: "Playlist" },
              content: null,
              display: { id: crypto.randomUUID(), name: "Display" },
            },
          ],
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
      schedulesApi.endpoints.listSchedules.initiate({
        from: "2025-01-01",
        to: "2025-01-07",
      }),
    );
    const data = "data" in result ? result.data : undefined;
    if (!data) {
      throw new Error("Expected schedule window data");
    }
    expect(data).toHaveLength(1);
  });
});
