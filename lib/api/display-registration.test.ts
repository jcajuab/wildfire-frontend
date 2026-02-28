import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("display registration API", () => {
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

  test("createRegistrationCode posts without shared API key", async () => {
    const { displaysApi } = await import("@/lib/api/displays-api");
    let capturedBody: BodyInit | null | undefined;
    let capturedHeaders: HeadersInit | undefined;
    let capturedMethod = "";

    global.fetch = vi.fn(async (input, init) => {
      if (input instanceof Request) {
        capturedBody = input.body;
        capturedHeaders = input.headers;
        capturedMethod = input.method.toUpperCase();
      } else {
        capturedBody = init?.body;
        capturedHeaders = init?.headers;
        capturedMethod = String(init?.method ?? "").toUpperCase();
      }
      return new Response(
        JSON.stringify({
          data: {
            code: "123456",
            expiresAt: "2099-01-01T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
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
      displaysApi.endpoints.createRegistrationCode.initiate(),
    );

    expect("error" in result).toBe(false);
    expect(capturedMethod).toBe("POST");
    expect(capturedBody === undefined || capturedBody === null).toBe(true);

    const headers = new Headers(capturedHeaders);
    expect(headers.has("x-api-key")).toBe(false);
  });
});
