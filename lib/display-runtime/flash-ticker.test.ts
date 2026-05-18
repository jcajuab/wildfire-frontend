import { describe, expect, test } from "vitest";
import {
  buildFlashMarqueeStyle,
  getFlashBadgeClassName,
  getFlashMarqueeMessage,
  inferFlashRepeatCount,
} from "@/lib/display-runtime/flash-ticker";

describe("flash ticker helpers", () => {
  test("normalizes marquee message to non-empty trimmed text", () => {
    expect(getFlashMarqueeMessage("  hello wildfire  ")).toBe("hello wildfire");
    expect(getFlashMarqueeMessage("   ")).toBeNull();
  });

  test("maps known tones and falls back safely for unknown tone", () => {
    expect(getFlashBadgeClassName("INFO")).toContain("bg-primary");
    expect(getFlashBadgeClassName("WARNING")).toContain("bg-yellow-400");
    expect(getFlashBadgeClassName("WARNING")).toContain("text-black");
    expect(getFlashBadgeClassName("CRITICAL")).toContain("bg-destructive");
    expect(getFlashBadgeClassName("CRITICAL")).toContain("text-white");
    expect(getFlashBadgeClassName("UNKNOWN")).toContain("bg-primary");
  });

  test("infers repeat count from message width and container width", () => {
    const shortMessageRepeatCount = inferFlashRepeatCount({
      message: "ALERT",
      containerWidthPx: 1000,
    });
    const longMessageRepeatCount = inferFlashRepeatCount({
      message:
        "THIS IS A MUCH LONGER BREAKING MESSAGE THAT SHOULD NEED FEWER REPETITIONS",
      containerWidthPx: 1000,
    });
    expect(shortMessageRepeatCount).toBeGreaterThan(longMessageRepeatCount);
    expect(shortMessageRepeatCount).toBeGreaterThanOrEqual(4);
  });

  test("clamps marquee speed and keeps a minimum viewport-based height", () => {
    const style = buildFlashMarqueeStyle({
      message: "ALERT",
      heightPx: 8,
      speedPxPerSecond: 0,
      repeatCount: 11,
      viewportWidth: 1000,
      viewportHeight: 100,
    }) as Record<string, string>;

    expect(style.height).toBe("36px");
    expect(style.fontSize).toBe("14px");
    expect(style["--wildfire-flash-duration"]).toBe("110s");
  });

  test("sizes ticker height and contained text from the viewport height", () => {
    const style = buildFlashMarqueeStyle({
      message: "ALERT",
      heightPx: 48,
      speedPxPerSecond: 96,
      repeatCount: 4,
      viewportWidth: 1000,
      viewportHeight: 800,
    }) as Record<string, string>;

    expect(style.height).toBe("80px");
    expect(style.fontSize).toBe("24px");
  });
});
