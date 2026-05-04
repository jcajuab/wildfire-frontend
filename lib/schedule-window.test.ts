import { afterEach, describe, expect, test, vi } from "vitest";

import {
  defaultSchedulesBootstrapWindow,
  getScheduleWindow,
} from "@/lib/schedule-window";

describe("schedule window", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns a one-day window for resource day view", () => {
    expect(getScheduleWindow(new Date(2026, 2, 6), "resource-day")).toEqual({
      from: "2026-03-06",
      to: "2026-03-06",
    });
  });

  test("returns a seven-day inclusive window for resource week view", () => {
    expect(getScheduleWindow(new Date(2026, 2, 6), "resource-week")).toEqual({
      from: "2026-03-06",
      to: "2026-03-12",
    });
  });

  test("defaults the bootstrap window to the current day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 6, 12));

    expect(defaultSchedulesBootstrapWindow()).toEqual({
      from: "2026-03-06",
      to: "2026-03-06",
    });
  });
});
