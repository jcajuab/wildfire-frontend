import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useCan } from "@/hooks/use-can";
import {
  playlistsApi,
  useDeletePlaylistMutation,
  useListPlaylistsQuery,
  type BackendPlaylistListResponse,
  type BackendPlaylistSummary,
  type PlaylistListQuery,
} from "@/lib/api/playlists-api";

import { usePlaylistsFilters } from "./use-playlists-filters";
import { usePlaylistsPage } from "./use-playlists-page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  playlistsApi: {
    endpoints: {
      listPlaylists: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useDeletePlaylistMutation: vi.fn(() => [vi.fn()]),
  useListPlaylistsQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  })),
}));

vi.mock("./use-playlists-filters", () => ({
  usePlaylistsFilters: vi.fn(),
}));

const useCanMock = vi.mocked(useCan);
const useDeletePlaylistMutationMock = vi.mocked(useDeletePlaylistMutation);
const useListPlaylistsQueryMock = vi.mocked(useListPlaylistsQuery);
const useListPlaylistsQueryStateMock = vi.mocked(
  playlistsApi.endpoints.listPlaylists.useQueryState,
);
const usePlaylistsFiltersMock = vi.mocked(usePlaylistsFilters);

const initialQuery: PlaylistListQuery = {
  page: 1,
  pageSize: 12,
  sortBy: "createdAt",
  sortDirection: "desc",
};

function makePlaylistsData(
  names: readonly string[],
): BackendPlaylistListResponse {
  return {
    items: names.map(
      (name, index): BackendPlaylistSummary => ({
        id: `playlist-${index + 1}`,
        name,
        description: null,
        status: "DRAFT",
        showCounter: true,
        itemsCount: 0,
        totalDuration: 0,
        previewItems: [],
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
        owner: {
          id: "user-1",
          username: "admin",
          name: "Admin",
        },
      }),
    ),
    total: names.length,
    page: 1,
    pageSize: 12,
  };
}

function mockFilters(
  overrides: Partial<ReturnType<typeof usePlaylistsFilters>>,
) {
  usePlaylistsFiltersMock.mockReturnValue({
    statusFilter: "all",
    search: "",
    page: 1,
    setPage: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handleClearFilters: vi.fn(),
    handleSearchChange: vi.fn(),
    ...overrides,
  });
}

describe("usePlaylistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useDeletePlaylistMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useDeletePlaylistMutation>);
    mockFilters({});
    useListPlaylistsQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useListPlaylistsQuery>);
    useListPlaylistsQueryStateMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<
      typeof playlistsApi.endpoints.listPlaylists.useQueryState
    >);
  });

  test("uses initial playlist data when returning to the initial query", () => {
    useListPlaylistsQueryMock.mockReturnValue({
      data: makePlaylistsData(["Filtered playlist"]),
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useListPlaylistsQuery>);

    const { result } = renderHook(() =>
      usePlaylistsPage({
        initialList: {
          queryArgs: initialQuery,
          data: makePlaylistsData(["Morning Loop"]),
        },
      }),
    );

    expect(useListPlaylistsQueryMock).toHaveBeenCalledWith(initialQuery, {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: true,
    });
    expect(result.current.playlists.map((playlist) => playlist.name)).toEqual([
      "Morning Loop",
    ]);
  });

  test("uses active playlist data for changed filters", () => {
    mockFilters({ statusFilter: "DRAFT" });
    useListPlaylistsQueryMock.mockReturnValue({
      data: makePlaylistsData(["Filtered playlist"]),
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useListPlaylistsQuery>);

    const { result } = renderHook(() =>
      usePlaylistsPage({
        initialList: {
          queryArgs: initialQuery,
          data: makePlaylistsData(["Morning Loop"]),
        },
      }),
    );

    expect(result.current.playlists.map((playlist) => playlist.name)).toEqual([
      "Filtered playlist",
    ]);
  });
});
