import { act, renderHook } from "@testing-library/react";
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
    deleteScheduleById: vi.fn(),
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

function mockScheduleFilters(
  scheduleWindow: ScheduleWindowQuery,
  overrides: Partial<ReturnType<typeof useScheduleFilters>> = {},
) {
  useScheduleFiltersMock.mockReturnValue({
    currentDate: new Date("2026-05-08T00:00:00.000Z"),
    view: "resource-day",
    setView: vi.fn(),
    resourceMode: "display",
    setResourceMode: vi.fn(),
    displayGroupSort: "alphabetical",
    setDisplayGroupSort: vi.fn(),
    scheduleTypeFilter: "all",
    setScheduleTypeFilter: vi.fn(),
    targetResourceIds: [],
    setTargetResourceIds: vi.fn(),
    scheduleWindow,
    handleClearFilters: vi.fn(),
    handlePrev: vi.fn(),
    handleNext: vi.fn(),
    handleToday: vi.fn(),
    ...overrides,
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

  test("filters schedules by schedule, display, playlist, and flash content text", () => {
    const baseBootstrap = makeBootstrapData(["Morning Loop", "Flash Alert"]);
    const bootstrap: SchedulesBootstrapResponse = {
      ...baseBootstrap,
      schedules: [
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-1",
          name: "Morning Loop",
          display: { id: "display-1", name: "Lobby Screen" },
          playlist: { id: "playlist-1", name: "Welcome Playlist" },
          content: null,
        },
        {
          ...baseBootstrap.schedules[1],
          id: "schedule-2",
          name: "Flash Alert",
          kind: "FLASH",
          display: { id: "display-2", name: "Gym Display" },
          playlist: null,
          content: {
            id: "content-1",
            title: "Emergency Ticker",
            type: "FLASH",
            flashMessage: "Proceed to exits",
            flashTone: "WARNING",
          },
        },
      ],
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    act(() => result.current.setSearch("gym"));
    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Flash Alert",
    ]);

    act(() => result.current.setSearch("welcome"));
    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Morning Loop",
    ]);

    act(() => result.current.setSearch("ticker"));
    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Flash Alert",
    ]);
  });

  test("filters schedules by schedule type", () => {
    mockScheduleFilters(initialWindow, { scheduleTypeFilter: "flash" });
    const baseBootstrap = makeBootstrapData(["Morning Loop", "Flash Alert"]);
    const bootstrap: SchedulesBootstrapResponse = {
      ...baseBootstrap,
      schedules: [
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-1",
          name: "Morning Loop",
          kind: "PLAYLIST",
          displayId: "display-1",
          display: { id: "display-1", name: "Lobby" },
        },
        {
          ...baseBootstrap.schedules[1],
          id: "schedule-2",
          name: "Flash Alert",
          kind: "FLASH",
          displayId: "display-2",
          playlist: null,
          content: {
            id: "content-1",
            title: "Emergency Ticker",
            type: "FLASH",
            flashMessage: "Proceed to exits",
            flashTone: "WARNING",
          },
          display: { id: "display-2", name: "Gym" },
        },
      ],
      displayOptions: [
        { id: "display-1", name: "Lobby" },
        { id: "display-2", name: "Gym" },
      ],
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Flash Alert",
    ]);
    expect(result.current.filteredDisplayResources).toEqual([
      { id: "display-2", name: "Gym" },
    ]);
  });

  test("filters schedules and resources by multiple target displays", () => {
    mockScheduleFilters(initialWindow, {
      targetResourceIds: ["display-1", "display-3"],
    });
    const baseBootstrap = makeBootstrapData(["Lobby Loop", "Gym Alert"]);
    const bootstrap: SchedulesBootstrapResponse = {
      ...baseBootstrap,
      schedules: [
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-1",
          name: "Lobby Loop",
          displayId: "display-1",
          display: { id: "display-1", name: "Lobby" },
        },
        {
          ...baseBootstrap.schedules[1],
          id: "schedule-2",
          name: "Gym Alert",
          displayId: "display-2",
          display: { id: "display-2", name: "Gym" },
        },
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-3",
          name: "Cafeteria Loop",
          displayId: "display-3",
          display: { id: "display-3", name: "Cafeteria" },
        },
      ],
      displayOptions: [
        { id: "display-1", name: "Lobby" },
        { id: "display-2", name: "Gym" },
        { id: "display-3", name: "Cafeteria" },
      ],
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Lobby Loop",
      "Cafeteria Loop",
    ]);
    expect(result.current.filteredDisplayResources).toEqual([
      { id: "display-1", name: "Lobby" },
      { id: "display-3", name: "Cafeteria" },
    ]);
  });

  test("filters schedules and resources by multiple target display groups", () => {
    mockScheduleFilters(initialWindow, {
      resourceMode: "display-group",
      targetResourceIds: ["group-1", "group-3"],
    });
    const baseBootstrap = makeBootstrapData(["Lobby Loop", "Gym Alert"]);
    const bootstrap: SchedulesBootstrapResponse = {
      ...baseBootstrap,
      schedules: [
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-1",
          name: "Lobby Loop",
          displayId: "display-1",
          display: { id: "display-1", name: "Lobby" },
        },
        {
          ...baseBootstrap.schedules[1],
          id: "schedule-2",
          name: "Gym Alert",
          displayId: "display-2",
          display: { id: "display-2", name: "Gym" },
        },
        {
          ...baseBootstrap.schedules[0],
          id: "schedule-3",
          name: "Cafeteria Loop",
          displayId: "display-3",
          display: { id: "display-3", name: "Cafeteria" },
        },
      ],
      displayOptions: [
        { id: "display-1", name: "Lobby" },
        { id: "display-2", name: "Gym" },
        { id: "display-3", name: "Cafeteria" },
      ],
      displayGroups: [
        {
          id: "group-1",
          name: "Public Areas",
          displayIds: ["display-1"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
        {
          id: "group-2",
          name: "Athletics",
          displayIds: ["display-2"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
        {
          id: "group-3",
          name: "Dining",
          displayIds: ["display-3"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
      ],
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    expect(result.current.schedules.map((schedule) => schedule.name)).toEqual([
      "Lobby Loop",
      "Cafeteria Loop",
    ]);
    expect(result.current.filteredDisplayGroups).toEqual([
      {
        id: "group-3",
        name: "Dining",
        displayIds: ["display-3"],
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
      {
        id: "group-1",
        name: "Public Areas",
        displayIds: ["display-1"],
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
    ]);
  });

  test("paginates visible display resources", () => {
    const bootstrap: SchedulesBootstrapResponse = {
      ...makeBootstrapData([]),
      displayOptions: Array.from({ length: 9 }, (_, index) => ({
        id: `display-${index + 1}`,
        name: `Display ${index + 1}`,
      })),
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    expect(result.current.resourceTotal).toBe(9);
    expect(result.current.paginatedDisplayResources).toHaveLength(8);

    act(() => result.current.setResourcePage(2));

    expect(result.current.resourcePage).toBe(2);
    expect(result.current.paginatedDisplayResources).toEqual([
      { id: "display-9", name: "Display 9" },
    ]);
  });

  test("resets resource pagination when target resources change", () => {
    const bootstrap: SchedulesBootstrapResponse = {
      ...makeBootstrapData([]),
      displayOptions: Array.from({ length: 9 }, (_, index) => ({
        id: `display-${index + 1}`,
        name: `Display ${index + 1}`,
      })),
    };
    useGetSchedulesBootstrapQueryStateMock.mockReturnValue({
      data: bootstrap,
      isFetching: false,
    } as unknown as ReturnType<
      typeof schedulesApi.endpoints.getSchedulesBootstrap.useQueryState
    >);

    const { result } = renderHook(() =>
      useSchedulesPage({
        initialBootstrap: {
          queryArgs: initialWindow,
          data: bootstrap,
        },
      }),
    );

    act(() => result.current.setResourcePage(2));
    expect(result.current.resourcePage).toBe(2);

    act(() => result.current.setTargetResourceIds(["display-1"]));

    expect(result.current.resourcePage).toBe(1);
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
