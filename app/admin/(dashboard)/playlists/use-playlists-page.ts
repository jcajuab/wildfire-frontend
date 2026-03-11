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
  mapBackendPlaylistBase,
  mapBackendPlaylistWithItems,
} from "@/lib/mappers/playlist-mapper";
import type { PlaylistStatusFilter } from "@/components/playlists/playlist-filter-popover";
import type { Content } from "@/types/content";
import type { Playlist } from "@/types/playlist";
import type { PlaylistItemsAtomicSnapshot } from "@/components/playlists/edit-playlist-items-dialog";
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
  playlists: Playlist[];
  totalPlaylists: number;
  availableContent: Array<
    Content & { readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT" }
  >;
  availableDisplays: readonly Display[];

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
  handleStatusFilterChange: (value: PlaylistStatusFilter) => void;
  handleClearFilters: () => void;
  handleSearchChange: (value: string) => void;
  handleManageItemsDialogOpenChange: (open: boolean) => void;
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

  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [manageItemsPlaylist, setManageItemsPlaylist] =
    useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [savePlaylistItemsAtomic] = useSavePlaylistItemsAtomicMutation();

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

  const handleManageItemsDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setManageItemsPlaylist(null);
    }
  }, []);

  const handleEditPlaylist = useCallback((playlist: Playlist) => {
    setEditPlaylist(playlist);
    setEditName(playlist.name);
    setEditDescription(playlist.description ?? "");
  }, []);

  const handleManageItems = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setManageItemsPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch (err) {
        notifyApiError(err, "Failed to load playlist items.");
      }
    },
    [loadPlaylist],
  );

  const handleSaveItems = useCallback(
    async (playlistId: string, items: PlaylistItemsAtomicSnapshot) => {
      if (isSavingPlaylistItemsRef.current) {
        return;
      }

      isSavingPlaylistItemsRef.current = true;
      setIsSavingPlaylistItems(true);

      try {
        await savePlaylistItemsAtomic({
          playlistId,
          items,
        }).unwrap();
        toast.success("Playlist items updated.");
        handleManageItemsDialogOpenChange(false);
      } catch (err) {
        notifyApiError(err, "Failed to update playlist items.");
      } finally {
        isSavingPlaylistItemsRef.current = false;
        setIsSavingPlaylistItems(false);
      }
    },
    [handleManageItemsDialogOpenChange, savePlaylistItemsAtomic],
  );

  const handlePreviewPlaylist = useCallback(
    async (playlist: Playlist) => {
      try {
        const detailed = await loadPlaylist(playlist.id, true).unwrap();
        setPreviewPlaylist(mapBackendPlaylistWithItems(detailed));
      } catch {
        setPreviewPlaylist(playlist);
      }
    },
    [loadPlaylist],
  );

  const handleDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setDeleteDialogOpen(true);
  }, []);

  const handleUpdatePlaylist = useCallback(async () => {
    if (!editPlaylist || editName.trim().length === 0) return;
    try {
      await updatePlaylist({
        id: editPlaylist.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
      }).unwrap();
      setEditPlaylist(null);
      toast.success("Playlist updated.");
    } catch (err) {
      notifyApiError(err, "Failed to update playlist.");
    }
  }, [editPlaylist, editName, editDescription, updatePlaylist]);

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
    previewPlaylist,
    editPlaylist,
    manageItemsPlaylist,
    playlistToDelete,
    deleteDialogOpen,
    editName,
    editDescription,
    isSavingPlaylistItems,
    setPage,
    setEditPlaylist,
    setPreviewPlaylist,
    setPlaylistToDelete,
    setEditName,
    setEditDescription,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleManageItemsDialogOpenChange,
    handleEditPlaylist,
    handleManageItems,
    handleSaveItems,
    handlePreviewPlaylist,
    handleDeletePlaylist,
    handleUpdatePlaylist,
    deletePlaylistMutation: deletePlaylistById,
  };
}
