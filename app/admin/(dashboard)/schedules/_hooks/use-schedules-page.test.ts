import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  canManageScheduleForUser,
  useSchedulesPage,
} from "./use-schedules-page";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  schedulesApi,
  useGetSchedulesBootstrapQuery,
  type BackendSchedule,
  type ScheduleWindowQuery,
  type SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
import type { AuthUser } from "@/types/auth";
import type { Schedule } from "@/types/schedule";
import { useScheduleFilters } from "./use-schedule-filters";

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "user-1", name: "Alice", isAdmin: false },
  })),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/lib/api/schedules-api", () => ({
  schedulesApi: {
    endpoints: {
      getSchedulesBootstrap: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useGetSchedulesBootstrapQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  })),
}));

vi.mock("./use-schedule-filters", () => ({
  useScheduleFilters: vi.fn(),
}));

vi.mock("./use-schedule-dialogs", () => ({
  useScheduleDialogs: vi.fn(() => ({
    createDialogKind: null,
    setCreateDialogKind: vi.fn(),
    viewDialogOpen: false,
    setViewDialogOpen: vi.fn(),
    editDialogOpen: false,
    setEditDialogOpen: vi.fn(),
    selectedSchedule: null,
    handleScheduleClick: vi.fn(),
    handleEditFromView: vi.fn(),
  })),
}));

vi.mock("./use-schedule-handlers", () => ({
  useScheduleHandlers: vi.fn(() => ({
    handleCreateSchedule: vi.fn(),
    handleDeleteSchedule: vi.fn(),
    handleSaveSchedule: vi.fn(),
  })),
}));

const useAuthMock = vi.mocked(useAuth);
const useCanMock = vi.mocked(useCan);
const useGetSchedulesBootstrapQueryMock = vi.mocked(
  useGetSchedulesBootstrapQuery,
);
const useGetSchedulesBootstrapQueryStateMock = vi.mocked(
  schedulesApi.endpoints.getSchedulesBootstrap.useQueryState,
);
const useScheduleFiltersMock = vi.mocked(useScheduleFilters);

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

const initialWindow: ScheduleWindowQuery = {
  from: "2026-05-08T00:00:00.000Z",
  to: "2026-05-09T00:00:00.000Z",
};

const nextWindow: ScheduleWindowQuery = {
  from: "2026-05-09T00:00:00.000Z",
  to: "2026-05-10T00:00:00.000Z",
};

function makeBootstrapData(
  names: readonly string[],
): SchedulesBootstrapResponse {
  return {
    schedules: names.map(
      (name, index): BackendSchedule => ({
        id: `schedule-${index + 1}`,
        name,
        kind: "PLAYLIST",
        playlistId: "playlist-1",
        contentId: null,
        displayId: "display-1",
        startDate: "2026-05-08",
        endDate: "2026-05-08",
        startTime: "09:00",
        endTime: "10:00",
        createdBy: "user-1",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
        playlist: {
          id: "playlist-1",
          name,
        },
        content: null,
        display: {
          id: "display-1",
          name: "Lobby",
        },
      }),
    ),
    displayOptions: [{ id: "display-1", name: "Lobby" }],
    displayGroups: [],
    playlistOptions: [{ id: "playlist-1", name: "Morning Loop" }],
    flashContentOptions: [],
  };
}

function mockScheduleFilters(scheduleWindow: ScheduleWindowQuery) {
  useScheduleFiltersMock.mockReturnValue({
    currentDate: new Date("2026-05-08T00:00:00.000Z"),
    view: "resource-day",
    setView: vi.fn(),
    resourceMode: "display",
    setResourceMode: vi.fn(),
    displayGroupSort: "alphabetical",
    setDisplayGroupSort: vi.fn(),
    scheduleWindow,
    handlePrev: vi.fn(),
    handleNext: vi.fn(),
    handleToday: vi.fn(),
  });
}

describe("useSchedulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthMock.mockReturnValue({
      user: makeUser(),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);
    useCanMock.mockReturnValue(true);
    mockScheduleFilters(initialWindow);
    useGetSchedulesBootstrapQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useGetSchedulesBootstrapQuery>);
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);
  });

  test("uses initial schedule bootstrap when returning to the initial window", () => {
    useGetSchedulesBootstrapQueryMock.mockReturnValue({
      data: makeBootstrapData(["Tomorrow"]),
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useGetSchedulesBootstrapQuery>);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: makeBootstrapData(["Today"]),
        },
      }),
    );

    expect(useGetSchedulesBootstrapQueryMock).toHaveBeenCalledWith(
      initialWindow,
      {
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
    );
    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Today",
    ]);
  });

  test("uses active schedule bootstrap for changed windows", () => {
    mockScheduleFilters(nextWindow);
    useGetSchedulesBootstrapQueryMock.mockReturnValue({
      data: makeBootstrapData(["Tomorrow"]),
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useGetSchedulesBootstrapQuery>);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: makeBootstrapData(["Today"]),
        },
      }),
    );

    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Tomorrow",
    ]);
  });

  test("keeps resource data empty while auth is not initialized", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isInitialized: false,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: makeBootstrapData(["Today"]),
        },
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.availableDisplays).toEqual([]);
  });

  test("surfaces bootstrap failures instead of treating them as empty resources", () => {
    const refetch = vi.fn();
    useGetSchedulesBootstrapQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useGetSchedulesBootstrapQuery>);

    const { result } = renderHook(() => useSchedulesPage());

    expect(result.current.isBootstrapError).toBe(true);
    expect(result.current.availableDisplays).toEqual([]);
    expect(result.current.refetch).toBe(refetch);
  });
});
