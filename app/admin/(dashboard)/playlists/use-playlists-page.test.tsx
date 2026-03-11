import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePlaylistsPage } from "./use-playlists-page";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useListContentQuery } from "@/lib/api/content-api";
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useListPlaylistsQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-query-state", () => ({
  useQueryEnumState: vi.fn(),
  useQueryStringState: vi.fn(),
  useQueryNumberState: vi.fn(),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock("@/lib/api/displays-api", () => ({
  useGetDisplaysQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  useListPlaylistsQuery: vi.fn(() => ({
    data: { items: [], total: 0 },
  })),
  useLazyGetPlaylistQuery: vi.fn(() => [vi.fn()]),
  useCreatePlaylistMutation: vi.fn(() => [vi.fn()]),
  useUpdatePlaylistMutation: vi.fn(() => [vi.fn()]),
  useDeletePlaylistMutation: vi.fn(() => [vi.fn()]),
  useSavePlaylistItemsAtomicMutation: vi.fn(() => [vi.fn()]),
}));

const useCanMock = vi.mocked(useCan);
const useQueryEnumStateMock = vi.mocked(useQueryEnumState);
const useQueryStringStateMock = vi.mocked(useQueryStringState);
const useQueryNumberStateMock = vi.mocked(useQueryNumberState);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useGetDisplaysQueryMock = vi.mocked(useGetDisplaysQuery);
const useListPlaylistsQueryMock = vi.mocked(useListPlaylistsQuery);
const useLazyGetPlaylistQueryMock = vi.mocked(useLazyGetPlaylistQuery);
const useCreatePlaylistMutationMock = vi.mocked(useCreatePlaylistMutation);
const useUpdatePlaylistMutationMock = vi.mocked(useUpdatePlaylistMutation);
const useDeletePlaylistMutationMock = vi.mocked(useDeletePlaylistMutation);
const useSavePlaylistItemsAtomicMutationMock = vi.mocked(
  useSavePlaylistItemsAtomicMutation,
);

const setStatusFilterMock = vi.fn();
const setSearchMock = vi.fn();
const setPageMock = vi.fn();

describe("usePlaylistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useQueryEnumStateMock.mockReturnValue([
      "DRAFT",
      setStatusFilterMock,
    ] as ReturnType<typeof useQueryEnumState>);
    useQueryStringStateMock.mockReturnValue([
      "morning",
      setSearchMock,
    ] as ReturnType<typeof useQueryStringState>);
    useQueryNumberStateMock.mockReturnValue([
      3,
      setPageMock,
    ] as ReturnType<typeof useQueryNumberState>);

    useListPlaylistsQueryMock.mockReturnValue({
      data: { items: [], total: 0 },
    } as ReturnType<typeof useListPlaylistsQuery>);
    useGetDisplaysQueryMock.mockReturnValue({
      data: { items: [] },
    } as ReturnType<typeof useGetDisplaysQuery>);
    useListContentQueryMock.mockReturnValue({
      data: { items: [] },
    } as ReturnType<typeof useListContentQuery>);

    useLazyGetPlaylistQueryMock.mockReturnValue([vi.fn()]);
    useCreatePlaylistMutationMock.mockReturnValue([vi.fn()]);
    useUpdatePlaylistMutationMock.mockReturnValue([vi.fn()]);
    useDeletePlaylistMutationMock.mockReturnValue([vi.fn()]);
    useSavePlaylistItemsAtomicMutationMock.mockReturnValue([vi.fn()]);
  });

  test("uses fixed recent sorting and clears status filters", () => {
    const { result } = renderHook(() => usePlaylistsPage());

    expect(useListPlaylistsQueryMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 12,
      status: "DRAFT",
      search: "morning",
      sortBy: "updatedAt",
      sortDirection: "desc",
    });

    expect("sortBy" in result.current).toBe(false);
    expect("handleSortChange" in result.current).toBe(false);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(setStatusFilterMock).toHaveBeenCalledWith("all");
    expect(setPageMock).toHaveBeenCalledWith(1);
  });
});
