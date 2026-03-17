import { describe, expect, test } from "vitest";
import { buildRuntimeTimings } from "@/lib/display-runtime/overflow-timing";

describe("overflow timing", () => {
  test("uses base duration as effective duration for image content", () => {
    const timings = buildRuntimeTimings({
      items: [
        {
          id: "item-1",
          duration: 10,
          content: {
            type: "IMAGE",
            width: 100,
            height: 1000,
          },
        },
      ],
    });
    expect(timings[0]?.effectiveDurationSeconds).toBe(10);
    expect(timings[0]?.overflowExtraSeconds).toBe(0);
  });

  test("uses base duration as effective duration for video content", () => {
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
    });
    expect(timings[0]?.effectiveDurationSeconds).toBe(12);
  });
});
