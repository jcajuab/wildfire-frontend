import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDisplaysPage } from "./use-displays-page";
import { useCan } from "@/hooks/use-can";
import { useDisplayFilters } from "./use-display-filters";
import {
  displaysApi,
  type DisplaysBootstrapResponse,
  useCreateDisplayGroupMutation,
  useGetDisplaysBootstrapQuery,
  useLazyGetDisplaysQuery,
  useLazyGetDisplaysBootstrapQuery,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
import { subscribeToDisplayLifecycleEvents } from "@/lib/api/display-events";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value: unknown) => value),
}));

vi.mock("./use-display-filters", () => ({
  useDisplayFilters: vi.fn(),
}));

vi.mock("@/lib/api/displays-api", () => ({
  displaysApi: {
    endpoints: {
      getDisplaysBootstrap: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isLoading: false,
          isFetching: false,
        })),
      },
    },
  },
  useGetDisplaysBootstrapQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useLazyGetDisplaysBootstrapQuery: vi.fn(() => [vi.fn()]),
  useLazyGetDisplaysQuery: vi.fn(() => [vi.fn()]),
  useLazyGetDisplayQuery: vi.fn(() => [vi.fn()]),
  useCreateDisplayGroupMutation: vi.fn(() => [vi.fn()]),
  useSetDisplayGroupsMutation: vi.fn(() => [vi.fn()]),
  useUnregisterDisplayMutation: vi.fn(() => [vi.fn()]),
  useUpdateDisplayMutation: vi.fn(() => [vi.fn()]),
}));

vi.mock("@/lib/api/display-events", () => ({
  subscribeToDisplayLifecycleEvents: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

const useCanMock = vi.mocked(useCan);
const useDisplayFiltersMock = vi.mocked(useDisplayFilters);
const useGetDisplaysBootstrapQueryMock = vi.mocked(
  useGetDisplaysBootstrapQuery,
);
const useGetDisplaysBootstrapQueryStateMock = vi.mocked(
  displaysApi.endpoints.getDisplaysBootstrap.useQueryState,
);
const useLazyGetDisplaysQueryMock = vi.mocked(useLazyGetDisplaysQuery);
const useLazyGetDisplaysBootstrapQueryMock = vi.mocked(
  useLazyGetDisplaysBootstrapQuery,
);
const useCreateDisplayGroupMutationMock = vi.mocked(
  useCreateDisplayGroupMutation,
);
const useSetDisplayGroupsMutationMock = vi.mocked(useSetDisplayGroupsMutation);
const useUnregisterDisplayMutationMock = vi.mocked(
  useUnregisterDisplayMutation,
);
const useUpdateDisplayMutationMock = vi.mocked(useUpdateDisplayMutation);
const subscribeToDisplayLifecycleEventsMock = vi.mocked(
  subscribeToDisplayLifecycleEvents,
);

const setStatusFilterMock = vi.fn();
const setSearchMock = vi.fn();
const setOutputFilterMock = vi.fn();
const setPageMock = vi.fn();
const setGroupsMock = vi.fn();
const refetchMock = vi.fn();

const bootstrapData: DisplaysBootstrapResponse = {
  displays: {
    items: [
      {
        id: "display-1",
        slug: "lobby-display",
        fingerprint: null,
        name: "Lobby Display",
        location: "Lobby",
        ipAddress: null,
        macAddress: null,
        screenWidth: 1920,
        screenHeight: 1080,
        output: "HDMI",
        orientation: "LANDSCAPE",
        lastSeenAt: null,
        status: "READY",
        nowPlaying: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "display-2",
        slug: "cafeteria-display",
        fingerprint: null,
        name: "Cafeteria Display",
        location: "Cafeteria",
        ipAddress: null,
        macAddress: null,
        screenWidth: 1920,
        screenHeight: 1080,
        output: "dp-0",
        orientation: "LANDSCAPE",
        lastSeenAt: null,
        status: "LIVE",
        nowPlaying: null,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ],
    total: 2,
    page: 1,
    pageSize: 100,
  },
  displayGroups: [
    {
      id: "group-1",
      name: "Lobby",
      displayIds: ["display-1"],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  ],
  displayOutputOptions: ["hdmi-0", "dp-0"],
  runtimeOverrides: {
    globalEmergency: {
      active: false,
      startedAt: null,
      activeSlotIndex: null,
    },
  },
  emergencySlots: [],
};

describe("useDisplaysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "LIVE",
      search: "operator",
      page: 2,
      groupFilters: ["Lobby"],
      normalizedOutputFilter: "hdmi-*",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSearchChange: setSearchMock,
      handleGroupFilterChange: setGroupsMock,
      handleOutputFilterChange: setOutputFilterMock,
      handleClearFilters: vi.fn(),
    });

    useGetDisplaysBootstrapQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useGetDisplaysBootstrapQuery>);
    useGetDisplaysBootstrapQueryStateMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<
      typeof displaysApi.endpoints.getDisplaysBootstrap.useQueryState
    >);
    useLazyGetDisplaysBootstrapQueryMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useLazyGetDisplaysBootstrapQuery>);
    useLazyGetDisplaysQueryMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useLazyGetDisplaysQuery>);
    useCreateDisplayGroupMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useCreateDisplayGroupMutation>);
    useSetDisplayGroupsMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useSetDisplayGroupsMutation>);
    useUnregisterDisplayMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useUnregisterDisplayMutation>);
    useUpdateDisplayMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useUpdateDisplayMutation>);
    subscribeToDisplayLifecycleEventsMock.mockReturnValue({
      close: vi.fn(),
    });
  });

  test("loads an unfiltered bootstrap query while URL filters stay client-side", () => {
    const { result } = renderHook(() => useDisplaysPage());

    expect(useGetDisplaysBootstrapQueryMock).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 100,
        sortBy: "name",
        sortDirection: "asc",
      },
      {
        refetchOnFocus: false,
        refetchOnReconnect: false,
        skip: false,
      },
    );

    expect("sortBy" in result.current).toBe(false);
    expect("handleSortChange" in result.current).toBe(false);
    expect("isViewDialogOpen" in result.current).toBe(false);
    expect("handleViewDetails" in result.current).toBe(false);
    expect("handleEditFromView" in result.current).toBe(false);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(useDisplayFiltersMock).toHaveBeenCalled();
  });

  test("derives filtered display results on the client", () => {
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "LIVE",
      search: "",
      page: 1,
      groupFilters: [],
      normalizedOutputFilter: "dp-*",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSearchChange: setSearchMock,
      handleGroupFilterChange: setGroupsMock,
      handleOutputFilterChange: setOutputFilterMock,
      handleClearFilters: vi.fn(),
    });
    useGetDisplaysBootstrapQueryMock.mockReturnValue({
      data: bootstrapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useGetDisplaysBootstrapQuery>);

    const { result } = renderHook(() => useDisplaysPage());

    expect(result.current.displays.map((display) => display.name)).toEqual([
      "Cafeteria Display",
    ]);
    expect(result.current.displaysData?.total).toBe(1);
  });

  test("uses initial bootstrap data while the matching RTK query is being seeded", () => {
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "all",
      search: "",
      page: 2,
      groupFilters: [],
      normalizedOutputFilter: "all",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSearchChange: setSearchMock,
      handleGroupFilterChange: setGroupsMock,
      handleOutputFilterChange: setOutputFilterMock,
      handleClearFilters: vi.fn(),
    });

    const { result } = renderHook(() =>
      useDisplaysPage({
        initialBootstrap: {
          queryArgs: {
            page: 1,
            pageSize: 100,
            sortBy: "name",
            sortDirection: "asc",
          },
          data: bootstrapData,
          isSeeded: false,
        },
      }),
    );

    expect(useGetDisplaysBootstrapQueryMock).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 100,
        sortBy: "name",
        sortDirection: "asc",
      },
      {
        refetchOnFocus: false,
        refetchOnReconnect: false,
        skip: true,
      },
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.displaysData?.total).toBe(2);
    expect(result.current.displays[0]?.name).toBe("Lobby Display");
  });
});
