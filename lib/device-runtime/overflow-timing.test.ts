import { describe, expect, test } from "vitest";
import {
  buildRuntimeTimings,
  computeOverflowExtraSeconds,
} from "@/lib/device-runtime/overflow-timing";

describe("overflow timing", () => {
  test("adds extra duration for overflowing image content", () => {
    const extra = computeOverflowExtraSeconds({
      item: {
        id: "item-1",
        duration: 10,
        content: {
          type: "IMAGE",
          width: 100,
          height: 1000,
        },
      },
      viewport: { width: 500, height: 400 },
      config: { scrollPixelsPerSecond: 20 },
    });
    expect(extra).toBeGreaterThan(0);
  });

  test("keeps base duration for non-overflowing video", () => {
    const timings = buildRuntimeTimings({
      items: [
        {
          id: "video-1",
          duration: 12,
          content: {
            type: "VIDEO",
            width: 1920,
            height: 1080,
          },
        },
      ],
      viewport: { width: 1366, height: 768 },
      config: { scrollPixelsPerSecond: 24 },
    });
    expect(timings[0]?.effectiveDurationSeconds).toBe(12);
  });
});
