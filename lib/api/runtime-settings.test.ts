import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getDeviceRuntimeSettings,
  updateDeviceRuntimeSettings,
} from "@/lib/api-client";

describe("runtime settings api", () => {
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

  test("gets runtime settings", async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ scrollPxPerSecond: 24 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await getDeviceRuntimeSettings();
    expect(result.scrollPxPerSecond).toBe(24);
  });

  test("updates runtime settings", async () => {
    let method = "";
    let body = "";
    global.fetch = vi.fn(async (_input, init) => {
      method = String(init?.method ?? "");
      body = String(init?.body ?? "");
      return new Response(JSON.stringify({ scrollPxPerSecond: 36 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await updateDeviceRuntimeSettings({ scrollPxPerSecond: 36 });
    expect(method).toBe("PATCH");
    expect(body).toContain('"scrollPxPerSecond":36');
    expect(result.scrollPxPerSecond).toBe(36);
  });
});
