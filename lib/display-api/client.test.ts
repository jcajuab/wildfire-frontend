import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createAuthChallenge,
  createRegistrationSession,
  fetchDisplayRegistrationConstraints,
} from "@/lib/display-api/client";

describe("display-api client contract validation", () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalApiVersion = process.env.NEXT_PUBLIC_API_VERSION;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    process.env.NEXT_PUBLIC_API_VERSION = "v1";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalApiVersion === undefined) {
      delete process.env.NEXT_PUBLIC_API_VERSION;
    } else {
      process.env.NEXT_PUBLIC_API_VERSION = originalApiVersion;
    }
  });

  test("fetchDisplayRegistrationConstraints parses backend constraints", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            slugPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
            minSlugLength: 3,
            maxSlugLength: 120,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const constraints = await fetchDisplayRegistrationConstraints();

    expect(constraints).toEqual({
      slugPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      minSlugLength: 3,
      maxSlugLength: 120,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/api/v1/displays/registration-constraints",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  test("createRegistrationSession rejects invalid constraints payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            registrationSessionId: "session-1",
            expiresAt: "2026-01-01T00:00:00.000Z",
            challengeNonce: "nonce-1",
            constraints: {
              slugPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              minSlugLength: 10,
              maxSlugLength: 3,
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(createRegistrationSession("123456")).rejects.toThrow(
      "maxSlugLength",
    );
  });

  test("createAuthChallenge parses envelope challenge payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            challengeToken: "challenge-token",
            expiresAt: "2026-01-01T00:00:00.000Z",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const challenge = await createAuthChallenge({
      slug: "lobby-display",
      keyId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });

    expect(challenge).toEqual({
      challengeToken: "challenge-token",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
  });

  test("createAuthChallenge rejects non-string challengeToken payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            challengeToken: 123,
            expiresAt: "2026-01-01T00:00:00.000Z",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      createAuthChallenge({
        slug: "lobby-display",
        keyId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      }),
    ).rejects.toThrow("challenge.challengeToken must be a string");
  });
});
