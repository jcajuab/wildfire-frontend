import { afterEach, describe, expect, test, vi } from "vitest";
import { createPlayerController } from "@/lib/display-runtime/player-controller";

describe("player controller", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("cycles through timeline using effective durations", () => {
    vi.useFakeTimers();
    const ticks: { index: number; tickCount: number }[] = [];
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
      onTick: ({ index, tickCount }) => ticks.push({ index, tickCount }),
    });

    controller.start();
    vi.advanceTimersByTime(1100);
    vi.advanceTimersByTime(3100);
    controller.stop();

    expect(ticks).toEqual([
      { index: 0, tickCount: 0 },
      { index: 1, tickCount: 1 },
      { index: 0, tickCount: 2 },
    ]);
  });

  test("fires incrementing tickCount for single-item playlist", () => {
    vi.useFakeTimers();
    const ticks: { index: number; tickCount: number }[] = [];
    const controller = createPlayerController({
      timings: [
        {
          id: "only",
          baseDurationSeconds: 5,
          overflowExtraSeconds: 0,
          effectiveDurationSeconds: 5,
        },
      ],
      onTick: ({ index, tickCount }) => ticks.push({ index, tickCount }),
    });

    controller.start();
    vi.advanceTimersByTime(5100);
    vi.advanceTimersByTime(5100);
    controller.stop();

    expect(ticks).toEqual([
      { index: 0, tickCount: 0 },
      { index: 0, tickCount: 1 },
      { index: 0, tickCount: 2 },
    ]);
  });
});
