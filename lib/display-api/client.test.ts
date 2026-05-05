import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createSignedHeaders } from "@/lib/crypto/request-signer";
import {
  createAuthChallenge,
  createRegistrationSession,
  fetchDisplayRegistrationConstraints,
  fetchSignedManifest,
} from "@/lib/display-api/client";

vi.mock("@/lib/crypto/request-signer", () => ({
  createSignedHeaders: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  authFetch: vi.fn((...args: Parameters<typeof fetch>) => fetch(...args)),
  ensureFreshAccessToken: vi.fn().mockResolvedValue(null),
  getAuthorizationHeaders: vi.fn().mockReturnValue({}),
}));

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
    const { authFetch: authFetchMock } = await import("@/lib/auth-session");
    expect(authFetchMock).toHaveBeenCalledWith(
      "http://example.test/v1/displays/registration-constraints",
      expect.objectContaining({
        method: "GET",
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
    ).rejects.toThrow("challengeToken must be a string");
  });

  test("fetchSignedManifest parses envelope payloads", async () => {
    vi.mocked(createSignedHeaders).mockResolvedValue({
      "x-display-key-id": "key-id",
      "x-display-slug": "lobby-display",
      "x-display-timestamp": "2026-01-01T00:00:00.000Z",
      "x-display-nonce": "nonce",
      "x-display-body-sha256": "hash",
      "x-display-signature": "signature",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            playlistId: null,
            playlistVersion: "v1",
            generatedAt: "2026-01-01T00:00:00.000Z",
            playback: {
              mode: "SCHEDULE",
              emergency: null,
              flash: null,
            },
            items: [
              {
                id: "item-1",
                sequence: 1,
                duration: 10,
                content: {
                  id: "content-1",
                  type: "IMAGE",
                  checksum: "checksum-1",
                  downloadUrl: "https://example.test/image.jpg",
                  thumbnailUrl: null,
                  mimeType: "image/jpeg",
                  width: 1000,
                  height: 3000,
                  duration: null,
                  textHtmlContent: null,
                  cropY: 1080,
                  cropHeight: 1080,
                  scaledHeight: 3240,
                  sliceIndex: 1,
                  sliceCount: 3,
                },
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchSignedManifest({
      registration: {
        displayId: "display-id",
        slug: "lobby-display",
        keyId: "key-id",
        keyAlias: "key-alias",
        fingerprint: "fp",
        output: "HDMI-1",
        registeredAt: "2026-01-01T00:00:00.000Z",
      },
      privateKey: {} as CryptoKey,
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("Expected ok result");
    expect(result.manifest.items[0]?.content.cropY).toBe(1080);
    expect(result.manifest.items[0]?.content.sliceCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/v1/display-runtime/lobby-display/manifest",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  test("fetchSignedManifest parses emergency playback with SLOT source", async () => {
    vi.mocked(createSignedHeaders).mockResolvedValue({
      "x-display-key-id": "key-id",
      "x-display-slug": "lobby-display",
      "x-display-timestamp": "2026-01-01T00:00:00.000Z",
      "x-display-nonce": "nonce",
      "x-display-body-sha256": "hash",
      "x-display-signature": "signature",
    });
    const emergencyContent = {
      id: "84c4c14f-d508-4807-a186-aa78f2a9fb66",
      type: "TEXT",
      checksum:
        "9b73ae3859b4db2a30886a815b512b8495f9af5ce2b88a9a84461658d254874a",
      thumbnailUrl: null,
      mimeType: "application/json",
      width: null,
      height: null,
      duration: null,
      textHtmlContent: "<p>Emergency</p>",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            playlistId: null,
            playlistVersion: "pv-emergency-slot",
            generatedAt: "2026-05-05T17:31:58.053Z",
            playback: {
              mode: "EMERGENCY",
              emergency: {
                source: "SLOT",
                startedAt: "2026-05-05T17:31:41.000Z",
                isGlobal: true,
                content: emergencyContent,
              },
              flash: null,
            },
            items: [
              {
                id: "emergency:84c4c14f-d508-4807-a186-aa78f2a9fb66",
                sequence: 1,
                duration: 86400,
                loop: false,
                content: emergencyContent,
              },
            ],
            schedules: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchSignedManifest({
      registration: {
        displayId: "display-id",
        slug: "lobby-display",
        keyId: "key-id",
        keyAlias: "key-alias",
        fingerprint: "fp",
        output: "HDMI-1",
        registeredAt: "2026-01-01T00:00:00.000Z",
      },
      privateKey: {} as CryptoKey,
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("Expected ok result");
    expect(result.manifest.playback.mode).toBe("EMERGENCY");
    expect(result.manifest.playback.emergency?.source).toBe("SLOT");
    expect(result.manifest.playback.emergency?.isGlobal).toBe(true);
    expect(result.manifest.playback.emergency?.content.id).toBe(
      "84c4c14f-d508-4807-a186-aa78f2a9fb66",
    );
  });

  test("fetchSignedManifest rejects missing envelope data", async () => {
    vi.mocked(createSignedHeaders).mockResolvedValue({
      "x-display-key-id": "key-id",
      "x-display-slug": "lobby-display",
      "x-display-timestamp": "2026-01-01T00:00:00.000Z",
      "x-display-nonce": "nonce",
      "x-display-body-sha256": "hash",
      "x-display-signature": "signature",
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          playlistId: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as unknown as typeof fetch;

    await expect(
      fetchSignedManifest({
        registration: {
          displayId: "display-id",
          slug: "lobby-display",
          keyId: "key-id",
          keyAlias: "key-alias",
          fingerprint: "fp",
          output: "HDMI-1",
          registeredAt: "2026-01-01T00:00:00.000Z",
        },
        privateKey: {} as CryptoKey,
      }),
    ).rejects.toThrow("missing envelope data field");
  });
});
