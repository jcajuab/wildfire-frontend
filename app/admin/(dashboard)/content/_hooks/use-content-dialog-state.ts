"use client";

import { useCallback, useState } from "react";
import type { Content } from "@/types/content";

export interface ContentDialogState {
  readonly isCreateDialogOpen: boolean;
  readonly setIsCreateDialogOpen: (open: boolean) => void;
  readonly createMode: "text" | "upload" | "flash" | null;
  readonly openCreateDialog: (mode: "text" | "upload" | "flash") => void;
  readonly contentToEdit: Content | null;
  readonly contentToDelete: Content | null;
  readonly isDeleteDialogOpen: boolean;
  readonly setIsDeleteDialogOpen: (open: boolean) => void;
  readonly handleEdit: (content: Content) => void;
  readonly handleDelete: (content: Content) => void;
  readonly closeEditDialog: (open: boolean) => void;
}

/**
 * Manages dialog state for content page (Create/Edit/Delete).
 * Pure UI state management with no API calls.
 */
export function useContentDialogState(): ContentDialogState {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<
    "text" | "upload" | "flash" | null
  >(null);
  const [contentToEdit, setContentToEdit] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = useCallback((content: Content) => {
    setContentToEdit(content);
  }, []);

  const handleDelete = useCallback((content: Content) => {
    setContentToDelete(content);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback((open: boolean) => {
    if (!open) {
      setContentToEdit(null);
    }
  }, []);

  const handleSetIsCreateDialogOpen = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setCreateMode(null);
    }
  }, []);

  const openCreateDialog = useCallback((mode: "text" | "upload" | "flash") => {
    setCreateMode(mode);
    setIsCreateDialogOpen(true);
  }, []);

  return {
    isCreateDialogOpen,
    setIsCreateDialogOpen: handleSetIsCreateDialogOpen,
    createMode,
    openCreateDialog,
    contentToEdit,
    contentToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleEdit,
    handleDelete,
    closeEditDialog,
  };
}
