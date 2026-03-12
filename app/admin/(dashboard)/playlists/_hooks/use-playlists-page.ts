"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/use-can";
import { useListContentQuery } from "@/lib/api/content-api";
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import {
  type PlaylistListQuery,
  useListPlaylistsQuery,
} from "@/lib/api/playlists-api";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import { mapBackendPlaylistBase } from "@/lib/mappers/playlist-mapper";
import type { Content } from "@/types/content";
import type { Playlist, PlaylistSortField } from "@/types/playlist";
import type { StatusFilter } from "@/components/playlists/playlist-status-tabs";
import type { PlaylistItemsAtomicSnapshot } from "@/components/playlists/edit-playlist-items-dialog";
import type { Display } from "@/lib/api/displays-api";
import { usePlaylistsFilters } from "./use-playlists-filters";
import { usePlaylistsDialogs } from "./use-playlists-dialogs";
import {
  usePlaylistsHandlers,
  type NewPlaylistPayload,
} from "./use-playlists-handlers";

export const PAGE_SIZE = 12;

export interface UsePlaylistsPageResult {
  // Permissions
  canUpdatePlaylist: boolean;
  canDeletePlaylist: boolean;

  // Filter state
  statusFilter: StatusFilter;
  sortBy: PlaylistSortField;
  search: string;
  page: number;

  // Query data
  playlists: Playlist[];
  totalPlaylists: number;
  availableContent: Array<
    Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" }
  >;
  availableDisplays: readonly Display[];

  // Dialog state
  createDialogOpen: boolean;
  previewPlaylist: Playlist | null;
  editPlaylist: Playlist | null;
  manageItemsPlaylist: Playlist | null;
  playlistToDelete: Playlist | null;
  deleteDialogOpen: boolean;
  editName: string;
  editDescription: string;
  isSavingPlaylistItems: boolean;

  // Setters
  setPage: (page: number) => void;
  setEditPlaylist: (playlist: Playlist | null) => void;
  setPreviewPlaylist: (playlist: Playlist | null) => void;
  setPlaylistToDelete: (playlist: Playlist | null) => void;
  setEditName: (name: string) => void;
  setEditDescription: (description: string) => void;

  // Handlers
  handleStatusFilterChange: (value: StatusFilter) => void;
  handleSortChange: (value: PlaylistSortField) => void;
  handleSearchChange: (value: string) => void;
  handleCreateDialogOpenChange: (open: boolean) => void;
  handleManageItemsDialogOpenChange: (open: boolean) => void;
  handleCreatePlaylist: (data: NewPlaylistPayload) => Promise<boolean>;
  handleEditPlaylist: (playlist: Playlist) => void;
  handleManageItems: (playlist: Playlist) => Promise<void>;
  handleSaveItems: (
    playlistId: string,
    items: PlaylistItemsAtomicSnapshot,
  ) => Promise<void>;
  handlePreviewPlaylist: (playlist: Playlist) => Promise<void>;
  handleDeletePlaylist: (playlist: Playlist) => void;
  handleUpdatePlaylist: () => Promise<void>;
  deletePlaylistMutation: (id: string) => Promise<void>;
}

const isPlaylistRenderableContent = (
  content: Content,
): content is Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" } =>
  content.type === "IMAGE" ||
  content.type === "VIDEO" ||
  content.type === "PDF" ||
  content.type === "TEXT";

export function usePlaylistsPage(): UsePlaylistsPageResult {
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");
  const canReadContent = useCan("content:read");

  const filters = usePlaylistsFilters();
  const dialogs = usePlaylistsDialogs();

  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page: filters.page,
      pageSize: PAGE_SIZE,
      status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
      search: filters.search.length > 0 ? filters.search : undefined,
      sortBy: filters.sortBy === "name" ? "name" : "updatedAt",
      sortDirection: filters.sortBy === "name" ? "asc" : "desc",
    }),
    [filters.page, filters.search, filters.sortBy, filters.statusFilter],
  );

  const { data: playlistsData } = useListPlaylistsQuery(playlistQuery, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: displaysData } = useGetDisplaysQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: contentData } = useListContentQuery(
    { page: 1, pageSize: 100 },
    { skip: !canReadContent },
  );

  const handlers = usePlaylistsHandlers({
    editPlaylist: dialogs.editPlaylist,
    editName: dialogs.editName,
    editDescription: dialogs.editDescription,
    setEditPlaylist: dialogs.setEditPlaylist,
    setPreviewPlaylist: dialogs.setPreviewPlaylist,
    setManageItemsPlaylist: dialogs.setManageItemsPlaylist,
    handleManageItemsDialogOpenChange:
      dialogs.handleManageItemsDialogOpenChange,
  });

  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistBase),
    [playlistsData?.items],
  );

  const availableContent = useMemo<
    Array<Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" }>
  >(
    () =>
      (contentData?.items ?? [])
        .map(mapBackendContentToContent)
        .filter(isPlaylistRenderableContent),
    [contentData?.items],
  );

  const totalPlaylists = playlistsData?.total ?? 0;

  return {
    canUpdatePlaylist,
    canDeletePlaylist,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    search: filters.search,
    page: filters.page,
    playlists,
    totalPlaylists,
    availableContent,
    availableDisplays: displaysData?.items ?? [],
    createDialogOpen: dialogs.createDialogOpen,
    previewPlaylist: dialogs.previewPlaylist,
    editPlaylist: dialogs.editPlaylist,
    manageItemsPlaylist: dialogs.manageItemsPlaylist,
    playlistToDelete: dialogs.playlistToDelete,
    deleteDialogOpen: dialogs.deleteDialogOpen,
    editName: dialogs.editName,
    editDescription: dialogs.editDescription,
    isSavingPlaylistItems: handlers.isSavingPlaylistItems,
    setPage: filters.setPage,
    setEditPlaylist: dialogs.setEditPlaylist,
    setPreviewPlaylist: dialogs.setPreviewPlaylist,
    setPlaylistToDelete: dialogs.setPlaylistToDelete,
    setEditName: dialogs.setEditName,
    setEditDescription: dialogs.setEditDescription,
    handleStatusFilterChange: filters.handleStatusFilterChange,
    handleSortChange: filters.handleSortChange,
    handleSearchChange: filters.handleSearchChange,
    handleCreateDialogOpenChange: dialogs.handleCreateDialogOpenChange,
    handleManageItemsDialogOpenChange:
      dialogs.handleManageItemsDialogOpenChange,
    handleCreatePlaylist: handlers.handleCreatePlaylist,
    handleEditPlaylist: dialogs.handleEditPlaylist,
    handleManageItems: handlers.handleManageItems,
    handleSaveItems: handlers.handleSaveItems,
    handlePreviewPlaylist: handlers.handlePreviewPlaylist,
    handleDeletePlaylist: dialogs.handleDeletePlaylist,
    handleUpdatePlaylist: handlers.handleUpdatePlaylist,
    deletePlaylistMutation: handlers.deletePlaylistMutation,
  };
}
