import { describe, expect, test } from "vitest";
import { computeNextScheduleBoundaryMs } from "@/lib/display-runtime/schedule-timer";
import type { ManifestScheduleWindow } from "@/lib/display-api/client";

const makeSchedule = (
  overrides: Partial<ManifestScheduleWindow> = {},
): ManifestScheduleWindow => ({
  id: "schedule-1",
  kind: "PLAYLIST",
  startTime: "09:00",
  endTime: "17:00",
  startDate: null,
  endDate: null,
  ...overrides,
});

describe("computeNextScheduleBoundaryMs", () => {
  test("returns null when no schedules provided", () => {
    const result = computeNextScheduleBoundaryMs(
      [],
      new Date("2026-03-19T12:00:00"),
    );
    expect(result).toBeNull();
  });

  test("computes correct ms to next startTime boundary", () => {
    // Now is 08:30, schedule starts at 09:00 -> 30 minutes = 1_800_000ms
    const now = new Date("2026-03-19T08:30:00");
    const schedule = makeSchedule({ startTime: "09:00", endTime: "17:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(30 * 60 * 1000);
  });

  test("computes correct ms to next endTime boundary", () => {
    // Now is 16:30, schedule ends at 17:00 -> 30 minutes = 1_800_000ms
    const now = new Date("2026-03-19T16:30:00");
    const schedule = makeSchedule({ startTime: "09:00", endTime: "17:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(30 * 60 * 1000);
  });

  test("handles overnight windows correctly", () => {
    // Schedule: 22:00 - 06:00 (overnight)
    // Now is 21:30 -> next boundary is startTime at 22:00 = 30 min
    const now = new Date("2026-03-19T21:30:00");
    const schedule = makeSchedule({ startTime: "22:00", endTime: "06:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(30 * 60 * 1000);
  });

  test("overnight window endTime boundary falls on next day", () => {
    // Schedule: 22:00 - 06:00 (overnight)
    // Now is 23:00 -> startTime already passed, endTime at 06:00 next day = 7 hours
    const now = new Date("2026-03-19T23:00:00");
    const schedule = makeSchedule({ startTime: "22:00", endTime: "06:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(7 * 60 * 60 * 1000);
  });

  test("skips schedules with past endDate", () => {
    const now = new Date("2026-03-19T12:00:00");
    const schedule = makeSchedule({
      startTime: "09:00",
      endTime: "17:00",
      endDate: "2026-03-18",
    });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBeNull();
  });

  test("skips schedules with future startDate", () => {
    const now = new Date("2026-03-19T12:00:00");
    const schedule = makeSchedule({
      startTime: "09:00",
      endTime: "17:00",
      startDate: "2026-03-20",
    });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBeNull();
  });

  test("when all boundaries passed today, returns first boundary tomorrow", () => {
    // Now is 18:00, schedule was 09:00-17:00 -> both boundaries passed
    // Next boundary is tomorrow at 09:00 = 15 hours
    const now = new Date("2026-03-19T18:00:00");
    const schedule = makeSchedule({ startTime: "09:00", endTime: "17:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(15 * 60 * 60 * 1000);
  });

  test("applies minimum 2000ms floor", () => {
    // Now is just 500ms before the boundary
    const now = new Date("2026-03-19T08:59:59.500");
    const schedule = makeSchedule({ startTime: "09:00", endTime: "17:00" });
    const result = computeNextScheduleBoundaryMs([schedule], now);
    expect(result).toBe(2000);
  });

  test("with multiple schedules, picks the nearest boundary", () => {
    const now = new Date("2026-03-19T08:00:00");
    const scheduleA = makeSchedule({
      id: "a",
      startTime: "09:00",
      endTime: "17:00",
    });
    const scheduleB = makeSchedule({
      id: "b",
      startTime: "08:30",
      endTime: "12:00",
    });
    // Schedule B starts at 08:30 = 30 min away; Schedule A starts at 09:00 = 60 min
    const result = computeNextScheduleBoundaryMs([scheduleA, scheduleB], now);
    expect(result).toBe(30 * 60 * 1000);
  });
});
