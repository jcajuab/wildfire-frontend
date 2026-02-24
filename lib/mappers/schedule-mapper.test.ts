import { describe, expect, test } from "vitest";
import {
  mapBackendSchedulesToSchedules,
  mapUpdateFormToScheduleRequest,
  mapUpdateFormToScheduleSeriesRequest,
} from "@/lib/mappers/schedule-mapper";
import type { ScheduleFormData } from "@/types/schedule";

const makeFormData = (): ScheduleFormData => ({
  name: "Weekdays",
  startDate: new Date("2026-01-05T00:00:00.000Z"),
  endDate: new Date("2026-02-05T00:00:00.000Z"),
  startTime: "08:00",
  endTime: "17:00",
  playlistId: "playlist-1",
  targetDisplayIds: ["device-1"],
  recurrenceEnabled: true,
  recurrence: "WEEKLY",
  selectedDays: [1, 3, 5],
  priority: 10,
  isActive: true,
});

describe("schedule-mapper", () => {
  test("groups recurring rows by series for recurrence display", () => {
    const schedules = mapBackendSchedulesToSchedules([
      {
        id: "schedule-1",
        seriesId: "series-1",
        name: "Weekdays",
        playlistId: "playlist-1",
        deviceId: "device-1",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        startTime: "08:00",
        endTime: "17:00",
        dayOfWeek: 1,
        priority: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        device: { id: "device-1", name: "Lobby" },
      },
      {
        id: "schedule-2",
        seriesId: "series-1",
        name: "Weekdays",
        playlistId: "playlist-1",
        deviceId: "device-1",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        startTime: "08:00",
        endTime: "17:00",
        dayOfWeek: 3,
        priority: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        device: { id: "device-1", name: "Lobby" },
      },
    ]);

    expect(schedules).toHaveLength(2);
    expect(schedules[0]?.seriesDays).toEqual([1, 3]);
    expect(schedules[0]?.recurrence).toBe("WEEKLY");
  });

  test("maps single-day series as non-recurring", () => {
    const schedules = mapBackendSchedulesToSchedules([
      {
        id: "schedule-single",
        seriesId: "series-single",
        name: "One-off",
        playlistId: "playlist-1",
        deviceId: "device-1",
        startDate: "2026-01-01",
        endDate: "2026-01-01",
        startTime: "08:00",
        endTime: "09:00",
        dayOfWeek: 2,
        priority: 5,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        device: { id: "device-1", name: "Lobby" },
      },
    ]);

    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.seriesDays).toEqual([2]);
    expect(schedules[0]?.recurrence).toBe("NONE");
  });

  test("maps seven-day series as daily recurrence", () => {
    const schedules = mapBackendSchedulesToSchedules(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        id: `schedule-${dayOfWeek}`,
        seriesId: "series-daily",
        name: "Everyday",
        playlistId: "playlist-1",
        deviceId: "device-1",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        startTime: "08:00",
        endTime: "17:00",
        dayOfWeek,
        priority: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        device: { id: "device-1", name: "Lobby" },
      })),
    );

    expect(schedules[0]?.seriesDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(schedules[0]?.recurrence).toBe("DAILY");
  });

  test("maps day and series update payloads with expected day fields", () => {
    const data = makeFormData();
    const single = mapUpdateFormToScheduleRequest("schedule-1", data);
    const series = mapUpdateFormToScheduleSeriesRequest("series-1", data);

    expect(single.dayOfWeek).toBe(1);
    expect(series.daysOfWeek).toEqual([1, 3, 5]);
  });
});
