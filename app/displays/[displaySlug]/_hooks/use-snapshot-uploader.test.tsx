import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useSnapshotUploader } from "./use-snapshot-uploader";
import {
  postSignedSnapshot,
  type DisplayManifest,
} from "@/lib/display-api/client";
import { getStoredDisplayKeyPair } from "@/lib/crypto/key-manager";
import type { DisplayRegistrationRecord } from "@/lib/display-identity/registration-store";

vi.mock("@/lib/display-api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/display-api/client")>();
  return {
    ...actual,
    postSignedSnapshot: vi.fn(),
  };
});

vi.mock("@/lib/crypto/key-manager", () => ({
  getStoredDisplayKeyPair: vi.fn(),
}));

const postSignedSnapshotMock = vi.mocked(postSignedSnapshot);
const getStoredDisplayKeyPairMock = vi.mocked(getStoredDisplayKeyPair);

async function flushSnapshotUpload(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  });
}

class FileReaderMock {
  result: string | ArrayBuffer | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(): void {
    this.result = "data:image/png;base64,aW1hZ2U=";
    this.onload?.();
  }
}

const registration: DisplayRegistrationRecord = {
  displayId: "display-1",
  slug: "lobby-display",
  keyId: "key-1",
  keyAlias: "display-key",
  fingerprint: "fingerprint",
  output: "hdmi-1",
  registeredAt: "2026-05-11T00:00:00.000Z",
};

function manifestWithSource(sourceUrl: string): DisplayManifest {
  return {
    playlistId: "playlist-1",
    showCounter: false,
    playlistVersion: "version-1",
    generatedAt: "2026-05-11T00:00:00.000Z",
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
        loop: false,
        content: {
          id: "content-1",
          type: "IMAGE",
          checksum: "checksum",
          downloadUrl: sourceUrl,
          thumbnailUrl: null,
          mimeType: "image/png",
          width: 1920,
          height: 1080,
          duration: null,
          textHtmlContent: null,
        },
      },
    ],
    schedules: [],
  };
}

describe("useSnapshotUploader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T00:00:00.000Z"));
    vi.clearAllMocks();
    getStoredDisplayKeyPairMock.mockResolvedValue({
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey,
    });
    postSignedSnapshotMock.mockResolvedValue(undefined);
    globalThis.FileReader = FileReaderMock as unknown as typeof FileReader;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["image"], { type: "image/png" })),
    } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("uploads the first snapshot immediately", async () => {
    renderHook(() =>
      useSnapshotUploader(
        manifestWithSource("https://cdn.test/frame.png"),
        0,
        registration,
      ),
    );

    await flushSnapshotUpload();

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(1);
    expect(postSignedSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        registration,
        imageDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    );
  });

  test("refreshes the same snapshot source after the upload interval", async () => {
    renderHook(() =>
      useSnapshotUploader(
        manifestWithSource("https://cdn.test/frame.png"),
        0,
        registration,
      ),
    );

    await flushSnapshotUpload();

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999);
    });

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await flushSnapshotUpload();

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(2);
  });

  test("uploads immediately when the active snapshot source changes", async () => {
    const { rerender } = renderHook(
      ({ manifest }) => useSnapshotUploader(manifest, 0, registration),
      {
        initialProps: {
          manifest: manifestWithSource("https://cdn.test/first.png"),
        },
      },
    );

    await flushSnapshotUpload();

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(1);

    rerender({
      manifest: manifestWithSource("https://cdn.test/second.png"),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await flushSnapshotUpload();

    expect(postSignedSnapshotMock).toHaveBeenCalledTimes(2);
  });

  test("does not upload without a registration", async () => {
    renderHook(() =>
      useSnapshotUploader(
        manifestWithSource("https://cdn.test/frame.png"),
        0,
        null,
      ),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(postSignedSnapshotMock).not.toHaveBeenCalled();
  });
});
