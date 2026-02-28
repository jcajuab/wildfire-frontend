import { describe, expect, test } from "vitest";
import {
  mapBackendSchedulesToSchedules,
  mapCreateFormToScheduleRequest,
  mapUpdateFormToScheduleRequest,
} from "@/lib/mappers/schedule-mapper";
import type { ScheduleFormData } from "@/types/schedule";

const makeFormData = (): ScheduleFormData => ({
  name: "January Campaign",
  startDate: new Date("2026-01-05T00:00:00.000Z"),
  endDate: new Date("2026-02-05T00:00:00.000Z"),
  startTime: "08:00",
  endTime: "17:00",
  playlistId: "playlist-1",
  targetDisplayIds: ["display-1"],
  priority: 10,
  isActive: true,
});

describe("schedule-mapper", () => {
  test("maps backend rows directly to schedule cards", () => {
    const schedules = mapBackendSchedulesToSchedules([
      {
        id: "schedule-1",
        name: "Week 1",
        playlistId: "playlist-1",
        displayId: "display-1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        startTime: "08:00",
        endTime: "17:00",
        priority: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        display: { id: "display-1", name: "Lobby" },
      },
    ]);

    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.id).toBe("schedule-1");
    expect(schedules[0]?.targetDisplays[0]?.id).toBe("display-1");
    expect(schedules[0]?.playlist.name).toBe("Morning");
  });

  test("maps create and update payloads without recurrence fields", () => {
    const data = makeFormData();
    const createPayload = mapCreateFormToScheduleRequest(data);
    const updatePayload = mapUpdateFormToScheduleRequest("schedule-1", data);

    expect(createPayload).toMatchObject({
      name: "January Campaign",
      playlistId: "playlist-1",
      displayId: "display-1",
      startTime: "08:00",
      endTime: "17:00",
      priority: 10,
      isActive: true,
    });
    expect("daysOfWeek" in createPayload).toBe(false);
    expect("dayOfWeek" in updatePayload).toBe(false);
  });
});
