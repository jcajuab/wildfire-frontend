import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  playlistsApi,
  useDeletePlaylistMutation,
  useListPlaylistsQuery,
  type BackendPlaylistListResponse,
  type BackendPlaylistSummary,
  type PlaylistListQuery,
} from "@/lib/api/playlists-api";
import { useGetUserOptionsQuery, useGetUserQuery } from "@/lib/api/rbac-api";

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

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
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

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(() => ({
    data: [],
  })),
  useGetUserQuery: vi.fn(() => ({
    data: undefined,
  })),
}));

vi.mock("./use-playlists-filters", () => ({
  usePlaylistsFilters: vi.fn(),
}));

const useCanMock = vi.mocked(useCan);
const useAuthMock = vi.mocked(useAuth);
const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);
const useGetUserQueryMock = vi.mocked(useGetUserQuery);
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
    ownerFilter: "all",
    sortFilter: "newest",
    search: "",
    page: 1,
    setPage: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handleOwnerFilterChange: vi.fn(),
    handleSortFilterChange: vi.fn(),
    handleClearFilters: vi.fn(),
    handleSearchChange: vi.fn(),
    ...overrides,
  });
}

describe("usePlaylistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({
      user: {
        id: "admin-id",
        username: "admin",
        email: null,
        name: "Admin",
        isAdmin: true,
        isInvitedUser: false,
        timezone: null,
        avatarUrl: null,
      },
      permissions: [],
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      can: vi.fn(() => true),
      login: vi.fn(),
      logout: vi.fn(),
      bootstrapSession: vi.fn(),
      updateSession: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          username: "admin",
          email: null,
          name: "Admin",
          isActive: true,
        },
      ],
      isFetching: false,
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);
    useGetUserQueryMock.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGetUserQuery>);
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
    mockFilters({
      statusFilter: "DRAFT",
      ownerFilter: "00000000-0000-4000-8000-000000000001",
      sortFilter: "name-asc",
    });
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

    expect(useListPlaylistsQueryMock).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 12,
        status: "DRAFT",
        ownerId: "00000000-0000-4000-8000-000000000001",
        search: undefined,
        sortBy: "name",
        sortDirection: "asc",
      },
      {
        refetchOnFocus: false,
        refetchOnReconnect: false,
        skip: false,
      },
    );
    expect(result.current.canFilterByOwner).toBe(true);
    expect(result.current.ownerOptions).toHaveLength(1);
    expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
      { q: undefined, limit: 25 },
      { skip: false },
    );
    expect(result.current.playlists.map((playlist) => playlist.name)).toEqual([
      "Filtered playlist",
    ]);
  });
});
