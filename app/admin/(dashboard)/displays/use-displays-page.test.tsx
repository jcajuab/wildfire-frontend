import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDisplaysPage } from "./use-displays-page";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryListState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useCreateDisplayGroupMutation,
  useGetDisplayGroupsQuery,
  useGetDisplayOutputOptionsQuery,
  useGetDisplaysQuery,
  useGetRuntimeOverridesQuery,
  useLazyGetDisplayQuery,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useUpdateDisplayMutation,
} from "@/lib/api/displays-api";
import { useListContentQuery } from "@/lib/api/content-api";
import { subscribeToDisplayLifecycleEvents } from "@/lib/api/display-events";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-query-state", () => ({
  useQueryEnumState: vi.fn(),
  useQueryListState: vi.fn(),
  useQueryNumberState: vi.fn(),
  useQueryStringState: vi.fn(),
}));

vi.mock("@/lib/api/displays-api", () => ({
  useGetDisplayGroupsQuery: vi.fn(() => ({ data: [] })),
  useGetDisplayOutputOptionsQuery: vi.fn(() => ({ data: [] })),
  useGetDisplaysQuery: vi.fn(() => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useGetRuntimeOverridesQuery: vi.fn(() => ({ data: undefined })),
  useLazyGetDisplayQuery: vi.fn(() => [vi.fn()]),
  useCreateDisplayGroupMutation: vi.fn(() => [vi.fn()]),
  useSetDisplayGroupsMutation: vi.fn(() => [vi.fn()]),
  useUnregisterDisplayMutation: vi.fn(() => [vi.fn()]),
  useUpdateDisplayMutation: vi.fn(() => [vi.fn()]),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock("@/lib/api/display-events", () => ({
  subscribeToDisplayLifecycleEvents: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

const useCanMock = vi.mocked(useCan);
const useQueryEnumStateMock = vi.mocked(useQueryEnumState);
const useQueryListStateMock = vi.mocked(useQueryListState);
const useQueryNumberStateMock = vi.mocked(useQueryNumberState);
const useQueryStringStateMock = vi.mocked(useQueryStringState);
const useGetDisplayGroupsQueryMock = vi.mocked(useGetDisplayGroupsQuery);
const useGetDisplayOutputOptionsQueryMock = vi.mocked(
  useGetDisplayOutputOptionsQuery,
);
const useGetDisplaysQueryMock = vi.mocked(useGetDisplaysQuery);
const useGetRuntimeOverridesQueryMock = vi.mocked(useGetRuntimeOverridesQuery);
const useLazyGetDisplayQueryMock = vi.mocked(useLazyGetDisplayQuery);
const useCreateDisplayGroupMutationMock = vi.mocked(
  useCreateDisplayGroupMutation,
);
const useSetDisplayGroupsMutationMock = vi.mocked(useSetDisplayGroupsMutation);
const useUnregisterDisplayMutationMock = vi.mocked(useUnregisterDisplayMutation);
const useUpdateDisplayMutationMock = vi.mocked(useUpdateDisplayMutation);
const useListContentQueryMock = vi.mocked(useListContentQuery);
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
    useQueryEnumStateMock.mockReturnValue([
      "LIVE",
      setStatusFilterMock,
    ] as ReturnType<typeof useQueryEnumState>);
    useQueryListStateMock.mockReturnValue([
      ["Lobby"],
      setGroupsMock,
    ] as ReturnType<typeof useQueryListState>);
    useQueryNumberStateMock.mockReturnValue([
      2,
      setPageMock,
    ] as ReturnType<typeof useQueryNumberState>);
    useQueryStringStateMock.mockImplementation((key: string) => {
      if (key === "q") {
        return ["operator", setSearchMock] as ReturnType<
          typeof useQueryStringState
        >;
      }
      return ["hdmi-1", setOutputFilterMock] as ReturnType<
        typeof useQueryStringState
      >;
    });

    useGetDisplayGroupsQueryMock.mockReturnValue({
      data: [{ id: "group-1", name: "Lobby", colorIndex: 0, displayIds: [] }],
    } as ReturnType<typeof useGetDisplayGroupsQuery>);
    useGetDisplayOutputOptionsQueryMock.mockReturnValue({
      data: ["hdmi-1", "hdmi-2"],
    } as ReturnType<typeof useGetDisplayOutputOptionsQuery>);
    useGetDisplaysQueryMock.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as ReturnType<typeof useGetDisplaysQuery>);
    useGetRuntimeOverridesQueryMock.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useGetRuntimeOverridesQuery>);
    useLazyGetDisplayQueryMock.mockReturnValue([vi.fn()]);
    useCreateDisplayGroupMutationMock.mockReturnValue([vi.fn()]);
    useSetDisplayGroupsMutationMock.mockReturnValue([vi.fn()]);
    useUnregisterDisplayMutationMock.mockReturnValue([vi.fn()]);
    useUpdateDisplayMutationMock.mockReturnValue([vi.fn()]);
    useListContentQueryMock.mockReturnValue({
      data: { items: [] },
    } as ReturnType<typeof useListContentQuery>);
    subscribeToDisplayLifecycleEventsMock.mockReturnValue({
      close: vi.fn(),
    });
  });

  test("uses fixed alphabetical sorting and clears status in filter reset", () => {
    const { result } = renderHook(() => useDisplaysPage());

    expect(useGetDisplaysQueryMock).toHaveBeenCalledWith(
      {
        page: 2,
        pageSize: 20,
        q: "operator",
        status: "LIVE",
        groupIds: ["group-1"],
        output: "hdmi-1",
        sortBy: "name",
        sortDirection: "asc",
      },
      {
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
    );

    expect("sortBy" in result.current).toBe(false);
    expect("handleSortChange" in result.current).toBe(false);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(setStatusFilterMock).toHaveBeenCalledWith("all");
    expect(setGroupsMock).toHaveBeenCalledWith([]);
    expect(setOutputFilterMock).toHaveBeenCalledWith("all");
    expect(setPageMock).toHaveBeenCalledWith(1);
  });
});
