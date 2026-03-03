import { describe, expect, test } from "vitest";
import { mapDisplayApiToDisplay } from "@/lib/map-display-to-display";
import type { Display as ApiDisplay } from "@/lib/api/displays-api";

const makeApiDisplay = (overrides?: Partial<ApiDisplay>): ApiDisplay => ({
  id: "display-1",
  displaySlug: "lobby-display",
  identifier: "AA:BB:CC:DD:EE:FF",
  displayFingerprint: null,
  name: "Lobby",
  location: "Main Hall",
  ipAddress: null,
  macAddress: null,
  screenWidth: 1920,
  screenHeight: 1080,
  outputType: "hdmi-0",
  orientation: null,
  lastSeenAt: null,
  status: "READY",
  nowPlaying: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("map-display-to-display", () => {
  test("maps nowPlaying playlist from backend payload", () => {
    const mapped = mapDisplayApiToDisplay(
      makeApiDisplay({
        nowPlaying: {
          title: null,
          playlist: "Morning Loop",
          progress: 0,
          duration: 0,
        },
      }),
    );

    expect(mapped.nowPlaying).toEqual({
      title: null,
      playlist: "Morning Loop",
      progress: 0,
      duration: 0,
    });
  });

  test("clamps negative playback values to zero", () => {
    const mapped = mapDisplayApiToDisplay(
      makeApiDisplay({
        nowPlaying: {
          title: null,
          playlist: "Morning Loop",
          progress: -5,
          duration: -10,
        },
      }),
    );

    expect(mapped.nowPlaying).toEqual({
      title: null,
      playlist: "Morning Loop",
      progress: 0,
      duration: 0,
    });
  });
});
