"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/use-can";
import {
  useLazyGetContentJobQuery,
  useListContentQuery,
} from "@/lib/api/content-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import { useContentJobMonitor } from "./content-job-monitor";
import { useContentPageFilters } from "./use-content-page-filters";
import { useContentPagePdfState } from "./use-content-page-pdf";
import { useContentDialogState } from "./use-content-dialog-state";
import { useContentCrudHandlers } from "./use-content-crud-handlers";

const PAGE_SIZE = 20;

/**
 * Main controller for content page.
 * Composes dialog state, CRUD handlers, filters, PDF state, and job monitoring.
 */
export function useContentPageController() {
  const canUpdateContent = useCan("content:update");
  const canDeleteContent = useCan("content:delete");
  const canDownloadContent = useCan("content:read");
  const filters = useContentPageFilters();
  const pdfState = useContentPagePdfState();
  const dialogState = useContentDialogState();

  const { data, isLoading, isError, error } = useListContentQuery({
    page: filters.page,
    pageSize: PAGE_SIZE,
    status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
    type: filters.typeFilter === "all" ? undefined : filters.typeFilter,
    search: filters.search.trim().length > 0 ? filters.search : undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const [getContentJob] = useLazyGetContentJobQuery();
  const { trackContentJob } = useContentJobMonitor({
    fetchJob: (jobId) => getContentJob(jobId).unwrap(),
  });

  const crudHandlers = useContentCrudHandlers({
    contentToEdit: dialogState.contentToEdit,
    contentToDelete: dialogState.contentToDelete,
    trackContentJob,
    pageCollectionsByParentId: pdfState.pageCollectionsByParentId,
    updatePageCollection: pdfState.updatePageCollection,
    setPageCollection: pdfState.setPageCollection,
  });

  const visibleContents = useMemo(
    () => (data?.items ?? []).map(mapBackendContentToContent),
    [data?.items],
  );

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
    pdfState,
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
    handleUploadFile: crudHandlers.handleUploadFile,
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
