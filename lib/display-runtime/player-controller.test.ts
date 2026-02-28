import { afterEach, describe, expect, test, vi } from "vitest";
import { createPlayerController } from "@/lib/display-runtime/player-controller";

describe("player controller", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("cycles through timeline using effective durations", () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const controller = createPlayerController({
      timings: [
        {
          id: "a",
          baseDurationSeconds: 1,
          overflowExtraSeconds: 0,
          effectiveDurationSeconds: 1,
        },
        {
          id: "b",
          baseDurationSeconds: 2,
          overflowExtraSeconds: 1,
          effectiveDurationSeconds: 3,
        },
      ],
      onTick: ({ index }) => ticks.push(index),
    });

    controller.start();
    vi.advanceTimersByTime(1100);
    vi.advanceTimersByTime(3100);
    controller.stop();

    expect(ticks).toEqual([0, 1, 0]);
  });
});
