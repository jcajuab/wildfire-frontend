import { describe, expect, test } from "vitest";
import { canManageScheduleForUser } from "./use-schedules-page";
import type { AuthUser } from "@/types/auth";
import type { Schedule } from "@/types/schedule";

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  name: "Alice",
  isAdmin: false,
  isInvitedUser: false,
  timezone: null,
  avatarUrl: null,
  ...overrides,
});

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: "schedule-1",
  name: "Morning",
  kind: "PLAYLIST",
  startDate: "2026-05-06",
  endDate: "2026-05-06",
  startTime: "09:00",
  endTime: "10:00",
  playlist: { id: "playlist-1", name: "Morning Loop" },
  content: null,
  display: { id: "display-1", name: "Lobby" },
  createdBy: "user-1",
  createdAt: "2026-05-06T00:00:00.000Z",
  updatedAt: "2026-05-06T00:00:00.000Z",
  ...overrides,
});

describe("canManageScheduleForUser", () => {
  test("allows creators and admins to manage schedules", () => {
    expect(canManageScheduleForUser(makeSchedule(), makeUser())).toBe(true);
    expect(
      canManageScheduleForUser(
        makeSchedule({ createdBy: "user-2" }),
        makeUser({ isAdmin: true }),
      ),
    ).toBe(true);
  });

  test("blocks non-creators from managing schedules", () => {
    expect(
      canManageScheduleForUser(
        makeSchedule({ createdBy: "user-2" }),
        makeUser(),
      ),
    ).toBe(false);
  });
});
