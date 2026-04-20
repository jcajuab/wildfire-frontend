import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthResponse } from "@/types/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthResponse(accessToken = "tok-1"): AuthResponse {
  return {
    type: "bearer",
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: "u1",
      username: "test",
      email: null,
      name: "Test User",
      isAdmin: false,
      isInvitedUser: false,
      timezone: null,
      avatarUrl: null,
    },
    permissions: [],
  };
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data: body }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeErrorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "ERR",
        message,
        requestId: "req-1",
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Provide a stable base URL.
  process.env.NEXT_PUBLIC_API_URL = "";
  process.env.NEXT_PUBLIC_API_VERSION = "v1";

  // Stub BroadcastChannel so the module doesn't crash in jsdom.
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage() {}
      close() {}
    },
  );

  // Reset modules so each test gets a fresh singleton (refreshPromise = null).
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Test 1: 5 concurrent authFetch calls produce exactly one /auth/refresh
// ---------------------------------------------------------------------------

describe("refreshAccessToken singleton", () => {
  test("5 concurrent authFetch calls with expired access token produce exactly one /auth/refresh call, all 5 originals retry and succeed", async () => {
    let refreshCallCount = 0;
    let resourceCallCount = 0;

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/auth/refresh")) {
        refreshCallCount += 1;
        return makeJsonResponse(makeAuthResponse("fresh-tok"));
      }

      resourceCallCount += 1;
      // First 5 resource calls return 401 to trigger the retry path in authFetch.
      // Subsequent calls (the retries) return 200.
      if (resourceCallCount <= 5) {
        return new Response(JSON.stringify({ error: "unauth" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const { authFetch, setAuthSession } = await import("@/lib/auth-session");

    // Seed an expired access token so the 401 retry path fires.
    setAuthSession({
      ...makeAuthResponse("expired-tok"),
      accessTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        authFetch("/v1/resource", {}, { retryOn401: true }),
      ),
    );

    expect(refreshCallCount).toBe(1);
    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.status).toBe(200);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 2: second wave 500 ms after refresh resolves reuses cached result
  // ---------------------------------------------------------------------------

  test("second wave of requests 500ms after refresh resolves reuses cached result (0 additional /auth/refresh)", async () => {
    vi.useFakeTimers();

    let refreshCallCount = 0;

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshCallCount += 1;
        return makeJsonResponse(makeAuthResponse("fresh-tok"));
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken } = await import("@/lib/auth-session");

    // First refresh — resolves the singleton and starts the 1s cooldown timer.
    const first = await refreshAccessToken();
    expect(first.accessToken).toBe("fresh-tok");
    expect(refreshCallCount).toBe(1);

    // Advance 500 ms — still within the 1-second cooldown window.
    // The setTimeout in .then() has NOT fired yet, so refreshPromise is still set.
    vi.advanceTimersByTime(500);

    // Second call within the cooldown window must reuse the cached promise.
    const second = await refreshAccessToken();
    expect(second.accessToken).toBe("fresh-tok");
    expect(refreshCallCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test 3: rejection clears singleton immediately; next call starts fresh
  // ---------------------------------------------------------------------------

  test("refresh singleton clears immediately on rejection, subsequent call starts a fresh refresh", async () => {
    let refreshCallCount = 0;

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshCallCount += 1;
        if (refreshCallCount === 1) {
          // First batch: server error (non-401 so clearAuthSession is NOT called).
          return makeErrorResponse(500, "internal error");
        }
        // Second call onwards: success.
        return makeJsonResponse(makeAuthResponse("fresh-tok-2"));
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken } = await import("@/lib/auth-session");

    // Fire 3 concurrent refresh calls — all should share the same rejection.
    const firstBatch = await Promise.allSettled([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(refreshCallCount).toBe(1);
    for (const result of firstBatch) {
      expect(result.status).toBe("rejected");
    }

    // Singleton must be cleared immediately on rejection.
    // A new call must trigger a fresh /auth/refresh.
    const second = await refreshAccessToken();
    expect(refreshCallCount).toBe(2);
    expect(second.accessToken).toBe("fresh-tok-2");
  });

  // ---------------------------------------------------------------------------
  // Test 4: 401 on refresh triggers clearAuthSession(true)
  // ---------------------------------------------------------------------------

  test("revoked refresh token (401 on refresh) triggers clearAuthSession(true)", async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return makeErrorResponse(401, "refresh token revoked");
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken, setAuthSession, getAuthSnapshot } =
      await import("@/lib/auth-session");

    // Seed a valid access token so there is session state to clear.
    setAuthSession(makeAuthResponse("old-tok"));
    expect(getAuthSnapshot().accessToken).toBe("old-tok");

    await expect(refreshAccessToken()).rejects.toThrow();

    // clearAuthSession(true) should have nulled out the access token.
    expect(getAuthSnapshot().accessToken).toBeNull();
  });
});
