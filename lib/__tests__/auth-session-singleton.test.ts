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

function requireAbortSignal(signal: AbortSignal | null): AbortSignal {
  expect(signal).not.toBeNull();
  if (signal == null) {
    throw new Error("Expected refresh request to capture an AbortSignal.");
  }
  return signal;
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
  vi.unstubAllGlobals();
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
  // Test 4: 401 on refresh does NOT clear session (callers handle it)
  // ---------------------------------------------------------------------------

  test("revoked refresh token (401 on refresh) does not clear session — callers decide", async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return makeErrorResponse(401, "refresh token revoked");
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken, setAuthSession, getAuthSnapshot } =
      await import("@/lib/auth-session");

    // Seed a valid access token so there is session state to check.
    setAuthSession(makeAuthResponse("old-tok"));
    expect(getAuthSnapshot().accessToken).toBe("old-tok");

    await expect(refreshAccessToken()).rejects.toThrow();

    // refreshAccessToken no longer clears the session on 401.
    // Callers (e.g. bootstrapAccessToken) are responsible for clearing.
    expect(getAuthSnapshot().accessToken).toBe("old-tok");
  });

  // ---------------------------------------------------------------------------
  // Test 5: bootstrapAccessToken clears session on 401
  // ---------------------------------------------------------------------------

  test("bootstrapAccessToken clears session when refresh returns 401", async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return makeErrorResponse(401, "refresh token revoked");
      }
      return makeJsonResponse({ ok: true });
    });

    // Provide a session hint so bootstrapAccessToken attempts a refresh.
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => (key === "wildfire_has_session" ? "1" : null),
      setItem: () => {},
      removeItem: () => {},
    });

    const { bootstrapAccessToken, getAuthSnapshot } =
      await import("@/lib/auth-session");

    await bootstrapAccessToken();

    // bootstrapAccessToken should have cleared the session on 401.
    expect(getAuthSnapshot().accessToken).toBeNull();
  });

  test("login clears cached refresh responses before future refreshes", async () => {
    let refreshCallCount = 0;

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshCallCount += 1;
        return makeJsonResponse(
          makeAuthResponse(`refresh-${refreshCallCount}`),
        );
      }
      if (url.includes("/auth/login")) {
        return makeJsonResponse(makeAuthResponse("login-tok"));
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken, loginWithPassword } =
      await import("@/lib/auth-session");

    const first = await refreshAccessToken();
    expect(first.accessToken).toBe("refresh-1");
    expect(refreshCallCount).toBe(1);

    await loginWithPassword({ username: "admin", password: "secret" });

    const second = await refreshAccessToken();
    expect(second.accessToken).toBe("refresh-2");
    expect(refreshCallCount).toBe(2);
  });

  test("in-flight refresh cannot overwrite a newer login session", async () => {
    let resolveRefresh: (response: Response) => void = () => {
      throw new Error("Refresh promise was not created.");
    };

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      if (url.includes("/auth/login")) {
        return makeJsonResponse(makeAuthResponse("login-tok"));
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken, loginWithPassword, getAuthSnapshot } =
      await import("@/lib/auth-session");

    const refresh = refreshAccessToken();
    await loginWithPassword({ username: "admin", password: "secret" });
    resolveRefresh(makeJsonResponse(makeAuthResponse("stale-refresh-tok")));

    await expect(refresh).rejects.toThrow("Stale refresh response ignored");
    expect(getAuthSnapshot().accessToken).toBe("login-tok");
  });

  test("server session seeding does not abort an in-flight refresh response", async () => {
    let refreshSignal: AbortSignal | null = null;
    let resolveRefresh: (response: Response) => void = () => {
      throw new Error("Refresh promise was not created.");
    };

    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/auth/refresh")) {
          refreshSignal =
            init?.signal instanceof AbortSignal ? init.signal : null;
          return new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          });
        }
        return makeJsonResponse({ ok: true });
      },
    );

    const { refreshAccessToken, seedAuthSession, getAuthSnapshot } =
      await import("@/lib/auth-session");

    const refresh = refreshAccessToken();
    await Promise.resolve();

    const signal = requireAbortSignal(refreshSignal);
    expect(signal.aborted).toBe(false);

    seedAuthSession(makeAuthResponse("server-seed-tok"));

    expect(signal.aborted).toBe(false);
    expect(getAuthSnapshot().accessToken).toBe("server-seed-tok");

    resolveRefresh(makeJsonResponse(makeAuthResponse("stale-refresh-tok")));

    await expect(refresh).rejects.toThrow("Stale refresh response ignored");
    expect(getAuthSnapshot().accessToken).toBe("server-seed-tok");
  });

  test("refresh lock rechecks session state before rotating the cookie", async () => {
    let refreshCallCount = 0;
    const lockRequest = vi.fn(
      async <T>(
        _name: string,
        _options: { mode: "exclusive" },
        callback: () => Promise<T>,
      ) => callback(),
    );

    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: lockRequest },
    });

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshCallCount += 1;
        return makeJsonResponse(makeAuthResponse("fresh-tok"));
      }
      return makeJsonResponse({ ok: true });
    });

    const { refreshAccessToken, seedAuthSession } =
      await import("@/lib/auth-session");

    lockRequest.mockImplementationOnce(
      async <T>(
        _name: string,
        _options: { mode: "exclusive" },
        callback: () => Promise<T>,
      ) => {
        seedAuthSession(makeAuthResponse("broadcast-tok"));
        return callback();
      },
    );

    const result = await refreshAccessToken();

    expect(lockRequest).toHaveBeenCalledWith(
      "wildfire-auth-refresh",
      { mode: "exclusive" },
      expect.any(Function),
    );
    expect(refreshCallCount).toBe(0);
    expect(result.accessToken).toBe("broadcast-tok");
  });

  test("stale bootstrap refresh failure does not purge a newer login session", async () => {
    let resolveRefresh: (response: Response) => void = () => {
      throw new Error("Refresh promise was not created.");
    };

    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => (key === "wildfire_has_session" ? "1" : null),
      setItem: () => {},
      removeItem: () => {},
    });

    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      if (url.includes("/auth/login")) {
        return makeJsonResponse(makeAuthResponse("login-tok"));
      }
      if (url.includes("/auth/logout")) {
        return new Response(null, { status: 204 });
      }
      return makeJsonResponse({ ok: true });
    });

    const { bootstrapAccessToken, loginWithPassword, getAuthSnapshot } =
      await import("@/lib/auth-session");

    const bootstrap = bootstrapAccessToken();
    await loginWithPassword({ username: "admin", password: "secret" });
    resolveRefresh(makeErrorResponse(401, "refresh token revoked"));
    await bootstrap;

    expect(getAuthSnapshot().accessToken).toBe("login-tok");
  });
});
