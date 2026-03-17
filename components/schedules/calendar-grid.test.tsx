import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CalendarGrid } from "@/components/schedules/calendar-grid";
import type { Schedule, ScheduleDisplay } from "@/types/schedule";

const display: ScheduleDisplay = {
  id: "display-1",
  name: "laptop",
};

const baseSchedule = {
  startDate: "2026-03-06",
  endDate: "2026-03-06",
  startTime: "05:00",
  endTime: "17:00",
  targetDisplay: display,
  isActive: true,
  createdAt: "2026-03-06T00:00:00.000Z",
  updatedAt: "2026-03-06T00:00:00.000Z",
} as const;

const schedules: Schedule[] = [
  {
    ...baseSchedule,
    id: "playlist-1",
    name: "Test Schedule",
    kind: "PLAYLIST",
    playlist: {
      id: "playlist-id-1",
      name: "Playlist 1",
    },
    content: null,
  },
  {
    ...baseSchedule,
    id: "flash-1",
    name: "FLASH TEST",
    kind: "FLASH",
    playlist: null,
    content: {
      id: "flash-content-1",
      title: "Ticker",
      type: "FLASH",
      flashMessage: "Breaking update",
      flashTone: "WARNING",
    },
  },
];

describe("CalendarGrid", () => {
  test("renders overlapping day schedules on distinct vertical lanes", () => {
    render(
      <CalendarGrid
        currentDate={new Date("2026-03-06T00:00:00.000Z")}
        view="resource-day"
        schedules={schedules}
        resources={[display]}
        resourceMode="display"
        displayGroups={[]}
        onScheduleClick={vi.fn()}
        resourceMode="display"
        displayGroups={[]}
      />,
    );

    const playlistEvent = screen.getByRole("button", {
      name: /view schedule test schedule/i,
    });
    const flashEvent = screen.getByRole("button", {
      name: /view schedule flash test/i,
    });

    const playlistTop = Number.parseFloat(playlistEvent.style.top);
    const flashTop = Number.parseFloat(flashEvent.style.top);

    expect(Number.isFinite(playlistTop)).toBe(true);
    expect(Number.isFinite(flashTop)).toBe(true);
    expect(Math.abs(playlistTop - flashTop)).toBeGreaterThanOrEqual(44);
  });
});
