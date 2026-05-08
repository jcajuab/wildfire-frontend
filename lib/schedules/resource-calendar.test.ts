import { describe, it, expect } from "vitest";
import {
  computeOverlapCounters,
  type ResourceCalendarEvent,
} from "./resource-calendar";

function makeEvent(
  overrides: Partial<ResourceCalendarEvent> & {
    scheduleId: string;
    startMinutes: number;
    endMinutes: number;
  },
): ResourceCalendarEvent {
  const id = overrides.id ?? `${overrides.scheduleId}:d1:2026-05-08`;
  return {
    id,
    scheduleId: overrides.scheduleId,
    resourceId: overrides.resourceId ?? "d1",
    dateKey: overrides.dateKey ?? "2026-05-08",
    startMinutes: overrides.startMinutes,
    endMinutes: overrides.endMinutes,
    timeLabel: overrides.timeLabel ?? "",
    kind: overrides.kind ?? "PLAYLIST",
  };
}

function makeScheduleMap(
  entries: Array<{ id: string; createdAt: string }>,
): ReadonlyMap<string, { createdAt: string }> {
  return new Map(entries.map((e) => [e.id, { createdAt: e.createdAt }]));
}

describe("computeOverlapCounters", () => {
  it("returns empty map for no events", () => {
    const result = computeOverlapCounters([], new Map());
    expect(result.size).toBe(0);
  });

  it("returns no counter for a single playlist event", () => {
    const events = [
      makeEvent({ scheduleId: "s1", startMinutes: 360, endMinutes: 540 }),
    ];
    const schedules = makeScheduleMap([
      { id: "s1", createdAt: "2026-05-01T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    const counter = result.get(events[0].id);
    expect(counter).toEqual({ position: -1, groupSize: 1 });
  });

  it("excludes FLASH events from counters", () => {
    const events = [
      makeEvent({
        scheduleId: "s1",
        startMinutes: 360,
        endMinutes: 540,
        kind: "FLASH",
        id: "flash:d1:2026-05-08",
      }),
      makeEvent({ scheduleId: "s2", startMinutes: 420, endMinutes: 600 }),
    ];
    const schedules = makeScheduleMap([
      { id: "s1", createdAt: "2026-05-01T00:00:00Z" },
      { id: "s2", createdAt: "2026-05-02T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.has("flash:d1:2026-05-08")).toBe(false);
    const s2Counter = result.get(events[1].id);
    expect(s2Counter).toEqual({ position: -1, groupSize: 1 });
  });

  it("assigns counters to two overlapping schedules by createdAt", () => {
    const events = [
      makeEvent({
        scheduleId: "s1",
        startMinutes: 360,
        endMinutes: 540,
        id: "s1:d1:day",
      }),
      makeEvent({
        scheduleId: "s2",
        startMinutes: 420,
        endMinutes: 600,
        id: "s2:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "s1", createdAt: "2026-05-01T00:00:00Z" },
      { id: "s2", createdAt: "2026-05-02T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.get("s1:d1:day")).toEqual({ position: 0, groupSize: 2 });
    expect(result.get("s2:d1:day")).toEqual({ position: 1, groupSize: 2 });
  });

  it("handles transitive overlaps as a single group", () => {
    // A (6AM-9AM), B (7AM-10AM), C (9AM-3PM)
    // A↔B overlap, B↔C overlap, A↔C do NOT directly overlap
    const events = [
      makeEvent({
        scheduleId: "sA",
        startMinutes: 360,
        endMinutes: 540,
        id: "sA:d1:day",
      }),
      makeEvent({
        scheduleId: "sB",
        startMinutes: 420,
        endMinutes: 600,
        id: "sB:d1:day",
      }),
      makeEvent({
        scheduleId: "sC",
        startMinutes: 540,
        endMinutes: 900,
        id: "sC:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "sA", createdAt: "2026-05-01T00:00:00Z" },
      { id: "sB", createdAt: "2026-05-02T00:00:00Z" },
      { id: "sC", createdAt: "2026-05-03T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.get("sA:d1:day")).toEqual({ position: 0, groupSize: 3 });
    expect(result.get("sB:d1:day")).toEqual({ position: 1, groupSize: 3 });
    expect(result.get("sC:d1:day")).toEqual({ position: 2, groupSize: 3 });
  });

  it("keeps independent overlap groups with separate numbering starting from 1", () => {
    // Morning group: A (7AM-12PM), B (7AM-12PM)
    // Afternoon group: C (2PM-5PM), D (4PM-6PM)
    const events = [
      makeEvent({
        scheduleId: "sA",
        startMinutes: 420,
        endMinutes: 720,
        id: "sA:d1:day",
      }),
      makeEvent({
        scheduleId: "sB",
        startMinutes: 420,
        endMinutes: 720,
        id: "sB:d1:day",
      }),
      makeEvent({
        scheduleId: "sC",
        startMinutes: 840,
        endMinutes: 1020,
        id: "sC:d1:day",
      }),
      makeEvent({
        scheduleId: "sD",
        startMinutes: 960,
        endMinutes: 1080,
        id: "sD:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "sA", createdAt: "2026-05-01T00:00:00Z" },
      { id: "sB", createdAt: "2026-05-02T00:00:00Z" },
      { id: "sC", createdAt: "2026-05-03T00:00:00Z" },
      { id: "sD", createdAt: "2026-05-04T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);

    // Morning group: counters 0, 1
    expect(result.get("sA:d1:day")).toEqual({ position: 0, groupSize: 2 });
    expect(result.get("sB:d1:day")).toEqual({ position: 1, groupSize: 2 });

    // Afternoon group: counters 0, 1 (restarts from 0)
    expect(result.get("sC:d1:day")).toEqual({ position: 0, groupSize: 2 });
    expect(result.get("sD:d1:day")).toEqual({ position: 1, groupSize: 2 });
  });

  it("non-overlapping schedule gets no counter even when others overlap", () => {
    // A (7AM-12PM), B (7AM-12PM), C (2PM-5PM) alone
    const events = [
      makeEvent({
        scheduleId: "sA",
        startMinutes: 420,
        endMinutes: 720,
        id: "sA:d1:day",
      }),
      makeEvent({
        scheduleId: "sB",
        startMinutes: 420,
        endMinutes: 720,
        id: "sB:d1:day",
      }),
      makeEvent({
        scheduleId: "sC",
        startMinutes: 840,
        endMinutes: 1020,
        id: "sC:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "sA", createdAt: "2026-05-01T00:00:00Z" },
      { id: "sB", createdAt: "2026-05-02T00:00:00Z" },
      { id: "sC", createdAt: "2026-05-03T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.get("sA:d1:day")).toEqual({ position: 0, groupSize: 2 });
    expect(result.get("sB:d1:day")).toEqual({ position: 1, groupSize: 2 });
    expect(result.get("sC:d1:day")).toEqual({ position: -1, groupSize: 1 });
  });

  it("sorts by createdAt regardless of event order in array", () => {
    // Events passed in reverse creation order
    const events = [
      makeEvent({
        scheduleId: "s2",
        startMinutes: 420,
        endMinutes: 600,
        id: "s2:d1:day",
      }),
      makeEvent({
        scheduleId: "s1",
        startMinutes: 360,
        endMinutes: 540,
        id: "s1:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "s1", createdAt: "2026-05-01T00:00:00Z" },
      { id: "s2", createdAt: "2026-05-02T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.get("s1:d1:day")).toEqual({ position: 0, groupSize: 2 });
    expect(result.get("s2:d1:day")).toEqual({ position: 1, groupSize: 2 });
  });

  it("adjacent but non-overlapping schedules (endA === startB) get no counter", () => {
    // A ends exactly when B starts — no overlap
    const events = [
      makeEvent({
        scheduleId: "s1",
        startMinutes: 360,
        endMinutes: 540,
        id: "s1:d1:day",
      }),
      makeEvent({
        scheduleId: "s2",
        startMinutes: 540,
        endMinutes: 720,
        id: "s2:d1:day",
      }),
    ];
    const schedules = makeScheduleMap([
      { id: "s1", createdAt: "2026-05-01T00:00:00Z" },
      { id: "s2", createdAt: "2026-05-02T00:00:00Z" },
    ]);
    const result = computeOverlapCounters(events, schedules);
    expect(result.get("s1:d1:day")).toEqual({ position: -1, groupSize: 1 });
    expect(result.get("s2:d1:day")).toEqual({ position: -1, groupSize: 1 });
  });
});
