import { act, renderHook, waitFor } from "@testing-library/react";
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
        output: "HDMI",
        lastSeenAt: null,
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "display-2",
        slug: "cafeteria-display",
        fingerprint: null,
        name: "Cafeteria Display",
        output: "dp-0",
        lastSeenAt: null,
        status: "LIVE",
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
};

const sortableBootstrapData: DisplaysBootstrapResponse = {
  ...bootstrapData,
  displays: {
    items: [
      {
        id: "display-alpha",
        slug: "alpha",
        fingerprint: null,
        name: "Alpha",
        output: "hdmi-0",
        lastSeenAt: null,
        status: "DOWN",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "display-bravo",
        slug: "bravo",
        fingerprint: null,
        name: "Bravo",
        output: "hdmi-1",
        lastSeenAt: null,
        status: "LIVE",
        createdAt: "2025-01-04T00:00:00.000Z",
        updatedAt: "2025-01-04T00:00:00.000Z",
      },
      {
        id: "display-charlie",
        slug: "charlie",
        fingerprint: null,
        name: "Charlie",
        output: "dp-0",
        lastSeenAt: null,
        status: "READY",
        createdAt: "2025-01-03T00:00:00.000Z",
        updatedAt: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "display-delta",
        slug: "delta",
        fingerprint: null,
        name: "Delta",
        output: "dvi-0",
        lastSeenAt: null,
        status: "PROCESSING",
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ],
    total: 4,
    page: 1,
    pageSize: 100,
  },
  displayGroups: [
    {
      id: "group-lobby",
      name: "Lobby",
      displayIds: ["display-alpha", "display-bravo"],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "group-hall",
      name: "Hall",
      displayIds: ["display-bravo"],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  ],
};

describe("useDisplaysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "LIVE",
      sortFilter: "name-asc",
      search: "operator",
      page: 2,
      groupFilters: ["Lobby"],
      normalizedOutputFilter: "hdmi-*",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSortChange: vi.fn(),
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

    expect(result.current.sortFilter).toBe("name-asc");
    expect("sortBy" in result.current).toBe(false);
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
      sortFilter: "name-asc",
      search: "",
      page: 1,
      groupFilters: [],
      normalizedOutputFilter: "dp-*",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSortChange: vi.fn(),
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

  test.each([
    ["name-asc", ["Alpha", "Bravo", "Charlie", "Delta"]],
    ["name-desc", ["Delta", "Charlie", "Bravo", "Alpha"]],
    ["groups-desc", ["Bravo", "Alpha", "Charlie", "Delta"]],
    ["groups-asc", ["Charlie", "Delta", "Alpha", "Bravo"]],
    ["created-desc", ["Bravo", "Charlie", "Delta", "Alpha"]],
  ] as const)("sorts display results by %s on the client", (sortFilter, names) => {
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "all",
      sortFilter,
      search: "",
      page: 1,
      groupFilters: [],
      normalizedOutputFilter: "all",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSortChange: vi.fn(),
      handleSearchChange: setSearchMock,
      handleGroupFilterChange: setGroupsMock,
      handleOutputFilterChange: setOutputFilterMock,
      handleClearFilters: vi.fn(),
    });
    useGetDisplaysBootstrapQueryMock.mockReturnValue({
      data: sortableBootstrapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useGetDisplaysBootstrapQuery>);

    const { result } = renderHook(() => useDisplaysPage());

    expect(result.current.displays.map((display) => display.name)).toEqual(
      names,
    );
  });

  test("neutralizes output filtering for users without display create permission", async () => {
    useCanMock.mockImplementation(
      (permission) => permission !== "displays:create",
    );
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "all",
      sortFilter: "name-asc",
      search: "",
      page: 1,
      groupFilters: [],
      normalizedOutputFilter: "dp-*",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSortChange: vi.fn(),
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

    expect(result.current.canCreateDisplay).toBe(false);
    expect(result.current.normalizedOutputFilter).toBe("all");
    expect(result.current.availableOutputFilters).toEqual([]);
    expect(result.current.displays.map((display) => display.name)).toEqual([
      "Cafeteria Display",
      "Lobby Display",
    ]);
    expect(result.current.displaysData?.total).toBe(2);

    await waitFor(() => {
      expect(setOutputFilterMock).toHaveBeenCalledWith("all");
    });
  });

  test("uses initial bootstrap data while the matching RTK query is being seeded", () => {
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "all",
      sortFilter: "name-asc",
      search: "",
      page: 2,
      groupFilters: [],
      normalizedOutputFilter: "all",
      setPage: setPageMock,
      handleStatusFilterChange: setStatusFilterMock,
      handleSortChange: vi.fn(),
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
    expect(result.current.displays[0]?.name).toBe("Cafeteria Display");
  });
});
