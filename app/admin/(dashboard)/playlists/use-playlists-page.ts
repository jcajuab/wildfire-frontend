"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useListContentQuery } from "@/lib/api/content-api";
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  type PlaylistListQuery,
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useListPlaylistsQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import {
  mapBackendPlaylistSummary,
  mapBackendPlaylistWithItems,
} from "@/lib/mappers/playlist-mapper";
import type { PlaylistStatusFilter } from "@/components/playlists/playlist-filter-popover";
import type { Content } from "@/types/content";
import type { Playlist, PlaylistSummary } from "@/types/playlist";
import type {
  PlaylistEditorSavePayload,
} from "@/components/playlists/edit-playlist-items-dialog";
import type { Display } from "@/lib/api/displays-api";

const PLAYLIST_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
export const PAGE_SIZE = 12;

const isPlaylistRenderableContent = (
  content: Content,
): content is Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" } =>
  content.type === "IMAGE" ||
  content.type === "VIDEO" ||
  content.type === "PDF" ||
  content.type === "TEXT";

export interface UsePlaylistsPageResult {
  // Permissions
  canUpdatePlaylist: boolean;
  canDeletePlaylist: boolean;

  // Filter state
  statusFilter: PlaylistStatusFilter;
  search: string;
  page: number;

  // Query data
  playlists: PlaylistSummary[];
  totalPlaylists: number;
  availableContent: Array<
    Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" }
  >;
  availableDisplays: readonly Display[];

  editorPlaylist: Playlist | null;
  playlistToDelete: PlaylistSummary | null;
  deleteDialogOpen: boolean;
  isSavingPlaylistItems: boolean;

  // Setters
  setPage: (page: number) => void;
  setEditorPlaylist: (playlist: Playlist | null) => void;
  setPlaylistToDelete: (playlist: PlaylistSummary | null) => void;

  // Handlers
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
  handleEditorDialogOpenChange: (open: boolean) => void;
  handleOpenEditor: (playlist: PlaylistSummary) => Promise<void>;
  handleSaveItems: (
    playlistId: string,
    payload: PlaylistEditorSavePayload,
  ) => Promise<void>;
  handleDeletePlaylist: (playlist: PlaylistSummary) => void;
  deletePlaylistMutation: (id: string) => Promise<void>;
}

export function usePlaylistsPage(): UsePlaylistsPageResult {
  const canUpdatePlaylist = useCan("playlists:update");
  const canDeletePlaylist = useCan("playlists:delete");
  const canReadContent = useCan("content:read");

  const [statusFilter, setStatusFilter] =
    useQueryEnumState<PlaylistStatusFilter>(
      "status",
      "all",
      PLAYLIST_STATUS_VALUES,
    );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const [editorPlaylist, setEditorPlaylist] = useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistSummary | null>(
    null,
  );
  const [isSavingPlaylistItems, setIsSavingPlaylistItems] = useState(false);
  const isSavingPlaylistItemsRef = useRef(false);

  const playlistQuery = useMemo<PlaylistListQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.length > 0 ? search : undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
    }),
    [page, search, statusFilter],
  );

  const { data: playlistsData } = useListPlaylistsQuery(playlistQuery);
  const { data: displaysData } = useGetDisplaysQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: contentData } = useListContentQuery(
    { page: 1, pageSize: 100 },
    { skip: !canReadContent },
  );

  const [loadPlaylist] = useLazyGetPlaylistQuery();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

  const deleteDialogOpen = playlistToDelete !== null;

  const playlists = useMemo(
    () => (playlistsData?.items ?? []).map(mapBackendPlaylistSummary),
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

  const handleStatusFilterChange = useCallback(
    (value: PlaylistStatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setPage(1);
  }, [setStatusFilter, setPage]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleEditorDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditorPlaylist(null);
    }
  }, []);

  const handleOpenEditor = useCallback(
    async (playlist: PlaylistSummary) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setEditorPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch (err) {
        notifyApiError(err, "Failed to load playlist items.");
      }
    },
    [loadPlaylist],
  );

  const handleSaveItems = useCallback(
    async (playlistId: string, payload: PlaylistEditorSavePayload) => {
      if (isSavingPlaylistItemsRef.current) {
        return;
      }

      isSavingPlaylistItemsRef.current = true;
      setIsSavingPlaylistItems(true);

      try {
        await updatePlaylist({
          id: playlistId,
          name: payload.metadata.name,
          description: payload.metadata.description,
        }).unwrap();

        try {
          await savePlaylistItemsAtomic({
            playlistId,
            items: payload.items,
          }).unwrap();
          toast.success("Playlist updated.");
          handleEditorDialogOpenChange(false);
        } catch (err) {
          notifyApiError(
            err,
            "Playlist info saved, but item changes failed. Review items and save again.",
          );
        }
      } catch (err) {
        notifyApiError(err, "Failed to update playlist info.");
      } finally {
        isSavingPlaylistItemsRef.current = false;
        setIsSavingPlaylistItems(false);
      }
    },
    [
      handleEditorDialogOpenChange,
      savePlaylistItemsAtomic,
      updatePlaylist,
    ],
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
    canUpdatePlaylist,
    canDeletePlaylist,
    statusFilter,
    search,
    page,
    playlists,
    totalPlaylists,
    availableContent,
    availableDisplays: displaysData?.items ?? [],
    editorPlaylist,
    playlistToDelete,
    deleteDialogOpen,
    isSavingPlaylistItems,
    setPage,
    setEditorPlaylist,
    setPlaylistToDelete,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleEditorDialogOpenChange,
    handleOpenEditor,
    handleSaveItems,
    handleDeletePlaylist,
    deletePlaylistMutation: deletePlaylistById,
  };
}
