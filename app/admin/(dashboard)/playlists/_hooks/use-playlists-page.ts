"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  playlistsApi,
  type BackendPlaylistListResponse,
  type PlaylistListQuery,
  useDeletePlaylistMutation,
  useListPlaylistsQuery,
} from "@/lib/api/playlists-api";
import { useGetUserOptionsQuery, useGetUserQuery } from "@/lib/api/rbac-api";
import { mapBackendPlaylistSummary } from "@/lib/mappers/playlist-mapper";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import type {
  PlaylistSortFilter,
  PlaylistStatusFilter,
} from "@/components/playlists/playlist-filter-popover";
import type { PlaylistSummary } from "@/types/playlist";
import { PLAYLISTS_PAGE_SIZE } from "@/lib/playlists-search-params";
import { usePlaylistsFilters } from "./use-playlists-filters";

export const PAGE_SIZE = PLAYLISTS_PAGE_SIZE;

export interface UsePlaylistsPageResult {
  // Permissions
  canCreatePlaylist: boolean;
  canUpdatePlaylist: boolean;
  canDeletePlaylist: boolean;
  canFilterByOwner: boolean;
  ownerOptions: ReturnType<typeof useGetUserOptionsQuery>["data"];
  ownerSearch: string;
  isOwnerOptionsFetching: boolean;

  // Filter state
  statusFilter: PlaylistStatusFilter;
  ownerFilter: string;
  sortFilter: PlaylistSortFilter;
  search: string;
  page: number;

  // Query data
  isLoading: boolean;
  isFetching: boolean;
  playlists: PlaylistSummary[];
  totalPlaylists: number;
  playlistToDelete: PlaylistSummary | null;
  deleteDialogOpen: boolean;

  // Setters
  setPage: (page: number) => void;
  setPlaylistToDelete: (playlist: PlaylistSummary | null) => void;

  // Handlers
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleOwnerSearchChange: (value: string) => void;
  handleOwnerFilterChange: (value: string) => void;
  handleSortFilterChange: (value: PlaylistSortFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
  handleEditPlaylist: (playlist: PlaylistSummary) => void;
  handleDeletePlaylist: (playlist: PlaylistSummary) => void;
  deletePlaylistMutation: (id: string) => Promise<void>;
}

export interface InitialPlaylistsList {
  readonly queryArgs: PlaylistListQuery;
  readonly data: BackendPlaylistListResponse;
}

interface UsePlaylistsPageOptions {
  readonly initialList?: InitialPlaylistsList;
}

function normalizedQueryKey(query: PlaylistListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    status: query.status ?? null,
    ownerId: query.ownerId ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
  });
}

function toPlaylistSortQuery(sortFilter: PlaylistSortFilter): {
  sortBy: NonNullable<PlaylistListQuery["sortBy"]>;
  sortDirection: NonNullable<PlaylistListQuery["sortDirection"]>;
} {
  if (sortFilter === "oldest") {
    return { sortBy: "createdAt", sortDirection: "asc" };
  }
  if (sortFilter === "updated-desc") {
    return { sortBy: "updatedAt", sortDirection: "desc" };
  }
  if (sortFilter === "name-asc") {
    return { sortBy: "name", sortDirection: "asc" };
  }
  if (sortFilter === "name-desc") {
    return { sortBy: "name", sortDirection: "desc" };
  }
  return { sortBy: "createdAt", sortDirection: "desc" };
}

export function usePlaylistsPage({
  initialList,
}: UsePlaylistsPageOptions = {}): UsePlaylistsPageResult {
  const router = useRouter();
  const { user } = useAuth();
  const canCreatePlaylist = useCan("playlists:create");
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");
  const canReadUsers = useCan("users:read");
  const canFilterByOwner = user?.isAdmin === true && canReadUsers;
  const [ownerSearch, setOwnerSearch] = useState("");
  const debouncedOwnerSearch = useDebounce(ownerSearch.trim(), 250);
  const {
    data: searchedOwnerOptions = [],
    isFetching: isOwnerOptionsFetching,
  } = useGetUserOptionsQuery(
    {
      q: debouncedOwnerSearch.length > 0 ? debouncedOwnerSearch : undefined,
      limit: 25,
    },
    {
      skip: !canFilterByOwner,
    },
  );

  const {
    statusFilter,
    ownerFilter,
    sortFilter,
    search,
    page,
    setPage,
    handleStatusFilterChange,
    handleOwnerFilterChange,
    handleSortFilterChange,
    handleClearFilters,
    handleSearchChange,
  } = usePlaylistsFilters();
  const selectedOwnerId = ownerFilter === "all" ? undefined : ownerFilter;
  const selectedOwnerInOptions = searchedOwnerOptions.some(
    (owner) => owner.id === selectedOwnerId,
  );
  const { data: selectedOwner } = useGetUserQuery(selectedOwnerId ?? "", {
    skip:
      !canFilterByOwner || selectedOwnerId == null || selectedOwnerInOptions,
  });
  const ownerOptions = useMemo(() => {
    if (!selectedOwner || selectedOwnerInOptions) {
      return searchedOwnerOptions;
    }
    return [selectedOwner, ...searchedOwnerOptions];
  }, [searchedOwnerOptions, selectedOwner, selectedOwnerInOptions]);
  const debouncedSearch = useDebounce(search, 500);
  const sortQuery = useMemo(
    () => toPlaylistSortQuery(sortFilter),
    [sortFilter],
  );

  const [playlistToDelete, setPlaylistToDelete] =
    useState<PlaylistSummary | null>(null);

  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      ownerId:
        canFilterByOwner && ownerFilter !== "all" ? ownerFilter : undefined,
      search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      sortBy: sortQuery.sortBy,
      sortDirection: sortQuery.sortDirection,
    }),
    [
      canFilterByOwner,
      debouncedSearch,
      ownerFilter,
      page,
      sortQuery,
      statusFilter,
    ],
  );
  const playlistQueryKey = useMemo(
    () => normalizedQueryKey(playlistQuery),
    [playlistQuery],
  );
  const initialListQueryKey = useMemo(
    () =>
      initialList != null ? normalizedQueryKey(initialList.queryArgs) : null,
    [initialList],
  );
  const isInitialListQuery =
    initialListQueryKey != null && initialListQueryKey === playlistQueryKey;

  const {
    data: queriedPlaylistsData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
  } = useListPlaylistsQuery(playlistQuery, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: isInitialListQuery,
  });
  const cachedInitialList = playlistsApi.endpoints.listPlaylists.useQueryState(
    playlistQuery,
    { skip: !isInitialListQuery },
  );
  const playlistsData = isInitialListQuery
    ? (cachedInitialList.data ?? initialList?.data)
    : queriedPlaylistsData;
  const isLoading =
    playlistsData == null && (isInitialListQuery ? false : queryIsLoading);
  const isFetching = isInitialListQuery
    ? cachedInitialList.isFetching
    : queryIsFetching;
  const [deletePlaylist] = useDeletePlaylistMutation();

  const deleteDialogOpen = playlistToDelete !== null;

  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistSummary),
    [playlistsData?.items],
  );

  const totalPlaylists = playlistsData?.total ?? 0;

  const handleEditPlaylist = useCallback(
    (playlist: PlaylistSummary) => {
      router.push(getPlaylistEditPath(playlist.id));
    },
    [router],
  );

  const handleDeletePlaylist = useCallback((playlist: PlaylistSummary) => {
    setPlaylistToDelete(playlist);
  }, []);

  const deletePlaylistById = useCallback(
    async (id: string) => {
      await deletePlaylist(id).unwrap();
    },
    [deletePlaylist],
  );

  return {
    canCreatePlaylist,
    canUpdatePlaylist,
    canDeletePlaylist,
    canFilterByOwner,
    ownerOptions,
    ownerSearch,
    isOwnerOptionsFetching,
    isLoading,
    isFetching,
    statusFilter,
    ownerFilter,
    sortFilter,
    search,
    page,
    playlists,
    totalPlaylists,
    playlistToDelete,
    deleteDialogOpen,
    setPage,
    setPlaylistToDelete,
    handleStatusFilterChange,
    handleOwnerSearchChange: setOwnerSearch,
    handleOwnerFilterChange,
    handleSortFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleEditPlaylist,
    handleDeletePlaylist,
    deletePlaylistMutation: deletePlaylistById,
  };
}
