import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("rbac api pagination aggregation", () => {
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

  test("getUsers aggregates every backend page", async () => {
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
                pageSize: 100,
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
                pageSize: 100,
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

    const result = await store.dispatch(rbacApi.endpoints.getUsers.initiate());
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.map((user) => user.id)).toEqual(["user-1", "user-2"]);
    }
  });

  test("getRoles returns guard error once max pages are exceeded", async () => {
    const { rbacApi } = await import("@/lib/api/rbac-api");

    global.fetch = vi.fn(async () => {
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
            total: 9999,
            page: 1,
            pageSize: 100,
            totalPages: 100,
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

    const result = await store.dispatch(rbacApi.endpoints.getRoles.initiate());
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatchObject({
        status: 500,
        data: "Failed to load roles: pagination limit reached.",
      });
    }
  });
});
