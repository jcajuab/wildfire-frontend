"use client";

import { useCallback, useState } from "react";
import type { Content } from "@/types/content";

export interface ContentDialogState {
  readonly isCreateDialogOpen: boolean;
  readonly setIsCreateDialogOpen: (open: boolean) => void;
  readonly contentToPreview: Content | null;
  readonly contentToEdit: Content | null;
  readonly contentToDelete: Content | null;
  readonly isDeleteDialogOpen: boolean;
  readonly setIsDeleteDialogOpen: (open: boolean) => void;
  readonly handleEdit: (content: Content) => void;
  readonly handlePreview: (content: Content) => void;
  readonly handleDelete: (content: Content) => void;
  readonly closeEditDialog: (open: boolean) => void;
  readonly closePreviewDialog: (open: boolean) => void;
}

/**
 * Manages dialog state for content page (Create/Edit/Preview/Delete).
 * Pure UI state management with no API calls.
 */
export function useContentDialogState(): ContentDialogState {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contentToPreview, setContentToPreview] = useState<Content | null>(
    null,
  );
  const [contentToEdit, setContentToEdit] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = useCallback((content: Content) => {
    setContentToEdit(content);
  }, []);

  const handlePreview = useCallback((content: Content) => {
    setContentToPreview(content);
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

  const closePreviewDialog = useCallback((open: boolean) => {
    if (!open) {
      setContentToPreview(null);
    }
  }, []);

  return {
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    contentToPreview,
    contentToEdit,
    contentToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleEdit,
    handlePreview,
    handleDelete,
    closeEditDialog,
    closePreviewDialog,
  };
}
