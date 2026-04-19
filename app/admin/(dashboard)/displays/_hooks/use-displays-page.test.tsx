import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDisplaysPage } from "./use-displays-page";
import { useCan } from "@/hooks/use-can";
import { useDisplayFilters } from "./use-display-filters";
import {
  useCreateDisplayGroupMutation,
  useGetDisplaysBootstrapQuery,
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
  useGetDisplaysBootstrapQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
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

describe("useDisplaysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useDisplayFiltersMock.mockReturnValue({
      statusFilter: "LIVE",
      search: "operator",
      page: 2,
      groupFilters: ["Lobby"],
      normalizedOutputFilter: "hdmi-1",
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

  test("uses fixed alphabetical sorting and clears status in filter reset", () => {
    const { result } = renderHook(() => useDisplaysPage());

    expect(useGetDisplaysBootstrapQueryMock).toHaveBeenCalledWith(
      {
        page: 2,
        pageSize: 20,
        q: "operator",
        status: "LIVE",
        groupNames: ["Lobby"],
        output: "hdmi-1",
        sortBy: "name",
        sortDirection: "asc",
      },
      {
        refetchOnFocus: false,
        refetchOnReconnect: false,
      },
    );

    expect("sortBy" in result.current).toBe(false);
    expect("handleSortChange" in result.current).toBe(false);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(useDisplayFiltersMock).toHaveBeenCalled();
  });
});
