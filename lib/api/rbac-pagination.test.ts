import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("rbac api queries", () => {
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

  test("getUsers returns paged backend data", async () => {
    const { rbacApi } = await import("@/lib/api/rbac-api");

    global.fetch = vi.fn(async (input) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);
      const page = Number(url.searchParams.get("page") ?? "1");
      expect(url.searchParams.get("q")).toBe("first");
      expect(url.searchParams.get("sortBy")).toBe("lastSeenAt");
      expect(url.searchParams.get("sortDirection")).toBe("desc");

      const payload =
        page === 1
          ? {
              data: [
                {
                  id: "user-1",
                  username: "first",
                  email: "first@example.com",
                  name: "First",
                  isActive: true,
                },
              ],
              meta: {
                total: 2,
                page: 1,
                pageSize: 10,
                totalPages: 1,
              },
            }
          : {
              data: [
                {
                  id: "user-2",
                  username: "second",
                  email: "second@example.com",
                  name: "Second",
                  isActive: true,
                },
              ],
              meta: {
                total: 2,
                page: 2,
                pageSize: 10,
                totalPages: 1,
              },
            };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const store = configureStore({
      reducer: {
        [rbacApi.reducerPath]: rbacApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(rbacApi.middleware),
    });

    const result = await store.dispatch(
      rbacApi.endpoints.getUsers.initiate({
        page: 1,
        pageSize: 10,
        q: "first",
        sortBy: "lastSeenAt",
        sortDirection: "desc",
      }),
    );
    const data = "data" in result ? result.data : undefined;
    if (!data) {
      throw new Error("Expected paged users data");
    }
    expect(data.items.map((user) => user.id)).toEqual(["user-1"]);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
  });

  test("getRoles returns paged backend data", async () => {
    const { rbacApi } = await import("@/lib/api/rbac-api");

    global.fetch = vi.fn(async (input) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);
      expect(url.searchParams.get("q")).toBe("Role");
      expect(url.searchParams.get("sortBy")).toBe("usersCount");
      expect(url.searchParams.get("sortDirection")).toBe("desc");

      return new Response(
        JSON.stringify({
          data: [
            {
              id: crypto.randomUUID(),
              name: "Role",
              description: null,
              isSystem: false,
              usersCount: 0,
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 10,
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
        [rbacApi.reducerPath]: rbacApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(rbacApi.middleware),
    });

    const result = await store.dispatch(
      rbacApi.endpoints.getRoles.initiate({
        page: 1,
        pageSize: 10,
        q: "Role",
        sortBy: "usersCount",
        sortDirection: "desc",
      }),
    );
    const data = "data" in result ? result.data : undefined;
    if (!data) {
      throw new Error("Expected paged roles data");
    }
    expect(data.items).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  test("getUserOptions uses the options endpoint", async () => {
    const { rbacApi } = await import("@/lib/api/rbac-api");

    global.fetch = vi.fn(async (input) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);
      expect(url.pathname.endsWith("/users/options")).toBe(true);
      expect(url.searchParams.get("q")).toBe("alex");
      expect(url.searchParams.get("limit")).toBe("25");

      return new Response(
        JSON.stringify({
          data: [
            {
              id: "user-1",
              username: "alex",
              email: "alex@example.com",
              name: "Alex",
              isActive: true,
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
        [rbacApi.reducerPath]: rbacApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(rbacApi.middleware),
    });

    const result = await store.dispatch(
      rbacApi.endpoints.getUserOptions.initiate({ q: "alex", limit: 25 }),
    );
    const data = "data" in result ? result.data : undefined;
    if (!data) {
      throw new Error("Expected user options data");
    }
    expect(data).toHaveLength(1);
    expect(data[0]?.username).toBe("alex");
  });
});
