import { describe, expect, test } from "vitest";
import {
  mapBackendSchedulesToSchedules,
  mapCreateFormToScheduleRequest,
  mapUpdateFormToScheduleRequest,
} from "@/lib/mappers/schedule-mapper";
import type { ScheduleFormData } from "@/types/schedule";

const makeFormData = (): ScheduleFormData => ({
  name: "January Campaign",
  kind: "PLAYLIST",
  startDate: "2026-01-05",
  endDate: "2026-02-05",
  startTime: "08:00",
  endTime: "17:00",
  playlistId: "playlist-1",
  contentId: null,
  targetDisplayId: "display-1",
  isActive: true,
});

describe("schedule-mapper", () => {
  test("maps backend rows directly to schedule cards", () => {
    const schedules = mapBackendSchedulesToSchedules([
      {
        id: "schedule-1",
        name: "Week 1",
        kind: "PLAYLIST",
        playlistId: "playlist-1",
        contentId: null,
        displayId: "display-1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        startTime: "08:00",
        endTime: "17:00",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        playlist: { id: "playlist-1", name: "Morning" },
        display: { id: "display-1", name: "Lobby" },
      },
    ]);

    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.id).toBe("schedule-1");
    expect(schedules[0]?.targetDisplay.id).toBe("display-1");
    expect(schedules[0]?.playlist?.name).toBe("Morning");
  });

  test("maps create and update payloads without recurrence fields", () => {
    const data = makeFormData();
    const createPayload = mapCreateFormToScheduleRequest(data);
    const updatePayload = mapUpdateFormToScheduleRequest("schedule-1", data);

    expect(createPayload).toMatchObject({
      name: "January Campaign",
      kind: "PLAYLIST",
      playlistId: "playlist-1",
      contentId: null,
      displayId: "display-1",
      startTime: "08:00",
      endTime: "17:00",
      isActive: true,
    });
    expect("daysOfWeek" in createPayload).toBe(false);
    expect("dayOfWeek" in updatePayload).toBe(false);
  });
});
