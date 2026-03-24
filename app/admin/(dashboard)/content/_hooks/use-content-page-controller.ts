"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
  useListContentQuery,
  useUploadPdfMutation,
} from "@/lib/api/content-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import { useContentJobMonitor } from "./content-job-monitor";
import { useContentPageFilters } from "./use-content-page-filters";
import { useContentDialogState } from "./use-content-dialog-state";
import { useContentCrudHandlers } from "./use-content-crud-handlers";

const PAGE_SIZE = 20;

/**
 * Main controller for content page.
 * Composes dialog state, CRUD handlers, filters, and job monitoring.
 */
export function useContentPageController() {
  const canUpdateContent = useCan("content:update");
  const canDeleteContent = useCan("content:delete");
  const canDownloadContent = useCan("content:read");
  const filters = useContentPageFilters();
  const dialogState = useContentDialogState();
  const debouncedSearch = useDebounce(filters.search, 500);

  const { data, isLoading, isError, error } = useListContentQuery({
    page: filters.page,
    pageSize: PAGE_SIZE,
    status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
    type: filters.typeFilter === "all" ? undefined : filters.typeFilter,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const searchParams = useSearchParams();
  const previewId = searchParams.get("preview");
  const editId = searchParams.get("edit");
  const createMode = searchParams.get("create");
  const handledPreviewRef = useRef<string | null>(null);
  const handledEditRef = useRef<string | null>(null);
  const handledCreateRef = useRef<string | null>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const [loadContent] = useLazyGetContentQuery();

  const {
    handlePreview: dialogHandlePreview,
    handleEdit: dialogHandleEdit,
    openCreateDialog,
  } = dialogState;

  useEffect(() => {
    if (previewId && handledPreviewRef.current !== previewId) {
      handledPreviewRef.current = previewId;
      void loadContent(previewId).then((result) => {
        if (result.data) {
          dialogHandlePreview(mapBackendContentToContent(result.data));
        }
      });
    }
  }, [previewId, loadContent, dialogHandlePreview]);

  const { handleClearFilters, handleSearchChange } = filters;

  useEffect(() => {
    if (editId && handledEditRef.current !== editId) {
      handledEditRef.current = editId;
      scrollTargetRef.current = editId;
      void loadContent(editId).then((result) => {
        if (result.data) {
          dialogHandleEdit(mapBackendContentToContent(result.data));
        }
      });
    }
  }, [editId, loadContent, dialogHandleEdit]);

  useEffect(() => {
    if (editId) {
      handleClearFilters();
      handleSearchChange("");
    }
  }, [editId, handleClearFilters, handleSearchChange]);

  useEffect(() => {
    if (
      createMode &&
      (createMode === "flash" ||
        createMode === "text" ||
        createMode === "upload") &&
      handledCreateRef.current !== createMode
    ) {
      handledCreateRef.current = createMode;
      openCreateDialog(createMode as "text" | "upload" | "flash");
    }
  }, [createMode, openCreateDialog]);

  const [getContentJob] = useLazyGetContentJobQuery();
  const { trackContentJob } = useContentJobMonitor({
    fetchJob: (jobId) => getContentJob(jobId).unwrap(),
  });

  const crudHandlers = useContentCrudHandlers({
    contentToEdit: dialogState.contentToEdit,
    contentToDelete: dialogState.contentToDelete,
    trackContentJob,
  });

  // PDF crop: upload then redirect to dedicated crop page
  const [uploadPdf] = useUploadPdfMutation();
  const router = useRouter();

  const handleUploadFile = async (name: string, file: File) => {
    if (file.type === "application/pdf") {
      try {
        const session = await uploadPdf(file).unwrap();
        sessionStorage.setItem(
          `wildfire:pdf-crop:${session.uploadId}`,
          JSON.stringify({ ...session, contentName: name }),
        );
        router.push(`/admin/content/pdf-crop?uploadId=${session.uploadId}`);
      } catch {
        // notifyApiError already called inside uploadPdf on failure via RTK
      }
      return;
    }
    await crudHandlers.handleUploadFile(name, file);
  };

  const visibleContents = useMemo(
    () => (data?.items ?? []).map(mapBackendContentToContent),
    [data?.items],
  );

  useEffect(() => {
    const targetId = scrollTargetRef.current;
    if (!targetId) return;
    const isVisible = visibleContents.some((c) => c.id === targetId);
    if (!isVisible) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`content-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        scrollTargetRef.current = null;
      }
    });
  }, [visibleContents]);

  return {
    canUpdateContent,
    canDeleteContent,
    canDownloadContent,
    data,
    error,
    errorMessage: getApiErrorMessage(
      error,
      "Failed to load content. Check the API and try again.",
    ),
    filters,
    visibleContents,
    pageSize: PAGE_SIZE,
    isLoading,
    isError,
    isCreateDialogOpen: dialogState.isCreateDialogOpen,
    setIsCreateDialogOpen: dialogState.setIsCreateDialogOpen,
    createMode: dialogState.createMode,
    openCreateDialog: dialogState.openCreateDialog,
    contentToPreview: dialogState.contentToPreview,
    contentToEdit: dialogState.contentToEdit,
    contentToDelete: dialogState.contentToDelete,
    isDeleteDialogOpen: dialogState.isDeleteDialogOpen,
    setIsDeleteDialogOpen: dialogState.setIsDeleteDialogOpen,
    handleUploadFile,
    handleCreateFlash: crudHandlers.handleCreateFlash,
    handleCreateText: crudHandlers.handleCreateText,
    handleEdit: dialogState.handleEdit,
    handlePreview: dialogState.handlePreview,
    handleDelete: dialogState.handleDelete,
    closeEditDialog: dialogState.closeEditDialog,
    closePreviewDialog: dialogState.closePreviewDialog,
    handleDownload: crudHandlers.handleDownload,
    handleSaveContent: crudHandlers.handleSaveContent,
    handleConfirmDelete: crudHandlers.handleConfirmDelete,
  };
}
