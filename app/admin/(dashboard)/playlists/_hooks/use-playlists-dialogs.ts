"use client";

import { useCallback, useState } from "react";
import type { Playlist } from "@/types/playlist";

export function usePlaylistsDialogs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setCreateDialogOpen(open);
  }, []);

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

  const handleDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setDeleteDialogOpen(true);
  }, []);

  return {
    createDialogOpen,
    setCreateDialogOpen,
    previewPlaylist,
    setPreviewPlaylist,
    editPlaylist,
    setEditPlaylist,
    manageItemsPlaylist,
    setManageItemsPlaylist,
    playlistToDelete,
    setPlaylistToDelete,
    deleteDialogOpen,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    handleCreateDialogOpenChange,
    handleManageItemsDialogOpenChange,
    handleEditPlaylist,
    handleDeletePlaylist,
  };
}
