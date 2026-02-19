import type { RuntimeItemTiming } from "@/lib/device-runtime/overflow-timing";

export interface PlayerTick {
  readonly index: number;
}

export interface PlayerController {
  readonly start: () => void;
  readonly stop: () => void;
}

export const createPlayerController = (input: {
  timings: readonly RuntimeItemTiming[];
  onTick: (tick: PlayerTick) => void;
}): PlayerController => {
  let active = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentIndex = 0;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const loop = () => {
    if (!active || input.timings.length === 0) {
      return;
    }
    input.onTick({ index: currentIndex });
    const durationMs =
      (input.timings[currentIndex]?.effectiveDurationSeconds ?? 1) * 1000;
    timer = setTimeout(() => {
      currentIndex = (currentIndex + 1) % input.timings.length;
      loop();
    }, durationMs);
  };

  return {
    start() {
      clearTimer();
      currentIndex = 0;
      active = true;
      loop();
    },
    stop() {
      active = false;
      clearTimer();
    },
  };
};
