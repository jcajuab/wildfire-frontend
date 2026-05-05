import { describe, expect, test } from "vitest";
import { mapDisplayApiToDisplay } from "@/lib/mappers/display-mapper";
import type { BackendDisplay } from "@/lib/api/displays-api";

const makeBackendDisplay = (
  overrides?: Partial<BackendDisplay>,
): BackendDisplay => ({
  id: "display-1",
  slug: "lobby-display",
  fingerprint: null,
  name: "Lobby",
  output: "hdmi-0",
  lastSeenAt: null,
  status: "READY",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("display-mapper", () => {
  test("maps required display output from backend payload", () => {
    const mapped = mapDisplayApiToDisplay(makeBackendDisplay());

    expect(mapped).toEqual(
      expect.objectContaining({
        id: "display-1",
        slug: "lobby-display",
        name: "Lobby",
        output: "hdmi-0",
        status: "READY",
      }),
    );
  });
});
