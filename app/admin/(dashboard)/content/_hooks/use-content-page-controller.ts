"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import {
  contentApi,
  type BackendContentListResponse,
  type ContentListQuery,
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
  useListContentQuery,
  useUploadPdfMutation,
} from "@/lib/api/content-api";
import { useAppSelector } from "@/lib/hooks";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { Content } from "@/types/content";
import { useContentJobMonitor } from "./content-job-monitor";
import { useContentPageFilters } from "./use-content-page-filters";
import { useContentDialogState } from "./use-content-dialog-state";
import { CONTENT_PAGE_SIZE } from "@/lib/content-search-params";
import { useContentCrudHandlers } from "./use-content-crud-handlers";

const PAGE_SIZE = CONTENT_PAGE_SIZE;
/** SSE delivers content_status_changed; long fallback only if SSE is unavailable */
const POLLING_FALLBACK_INTERVAL_MS = 300_000;

export interface InitialContentList {
  readonly queryArgs: ContentListQuery;
  readonly data: BackendContentListResponse;
  readonly isSeeded: boolean;
}

interface UseContentPageControllerOptions {
  readonly initialList?: InitialContentList;
}

function normalizedQueryKey(query: ContentListQuery): string {
  return JSON.stringify({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? PAGE_SIZE,
    status: query.status ?? null,
    type: query.type ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
  });
}

/**
 * Main controller for content page.
 * Composes dialog state, CRUD handlers, filters, and job monitoring.
 */
export function useContentPageController({
  initialList,
}: UseContentPageControllerOptions = {}) {
  const canCreateContent = useCan("content:create");
  const canUpdateContent = useCan("content:update");
  const canDeleteContent = useCan("content:delete");
  const canDownloadContent = useCan("content:read");
  const filters = useContentPageFilters();
  const dialogState = useContentDialogState();
  const debouncedSearch = useDebounce(filters.search, 500);
  const queryArgs: ContentListQuery = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
    type: filters.typeFilter === "all" ? undefined : filters.typeFilter,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  };
  const isInitialListQuery =
    initialList != null &&
    normalizedQueryKey(initialList.queryArgs) === normalizedQueryKey(queryArgs);

  const cacheHasData = useAppSelector(
    (state) =>
      contentApi.endpoints.listContent.select(queryArgs)(state).data != null,
  );

  const {
    data: queriedData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isError,
    error,
  } = useListContentQuery(queryArgs, {
    pollingInterval: POLLING_FALLBACK_INTERVAL_MS,
    refetchOnFocus: true,
    skip: isInitialListQuery && !cacheHasData,
  });
  const data =
    queriedData ??
    (isInitialListQuery ? initialList?.data : undefined);
  const isLoading =
    data == null &&
    (isInitialListQuery ? !initialList?.isSeeded : queryIsLoading);
  const isFetching = queryIsFetching;

  // SSE lifecycle events patch list rows via AdminEventProvider (no broad LIST invalidation).
  // Polling is a slow fallback if SSE is disconnected.

  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const createMode = searchParams.get("create");
  const handledEditRef = useRef<string | null>(null);
  const handledCreateRef = useRef<string | null>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const [loadContent] = useLazyGetContentQuery();

  const { handleEdit: dialogHandleEdit, openCreateDialog } = dialogState;

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
    fetchContent: (contentId) => loadContent(contentId).unwrap(),
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
      } catch (error) {
        notifyApiError(error, "Failed to upload PDF.");
      }
      return;
    }
    await crudHandlers.handleUploadFile(name, file);
  };
  const handleEdit = useCallback(
    (content: Content) => {
      void loadContent(content.id).then((result) => {
        if (result.data) {
          dialogHandleEdit(mapBackendContentToContent(result.data));
          return;
        }
        dialogHandleEdit(content);
      });
    },
    [dialogHandleEdit, loadContent],
  );

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
    canCreateContent,
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
    isFetching,
    isError,
    isCreateDialogOpen: dialogState.isCreateDialogOpen,
    setIsCreateDialogOpen: dialogState.setIsCreateDialogOpen,
    createMode: dialogState.createMode,
    openCreateDialog: dialogState.openCreateDialog,
    contentToEdit: dialogState.contentToEdit,
    contentToDelete: dialogState.contentToDelete,
    isDeleteDialogOpen: dialogState.isDeleteDialogOpen,
    setIsDeleteDialogOpen: dialogState.setIsDeleteDialogOpen,
    handleUploadFile,
    handleCreateFlash: crudHandlers.handleCreateFlash,
    handleCreateText: crudHandlers.handleCreateText,
    handleEdit,
    handleDelete: dialogState.handleDelete,
    closeEditDialog: dialogState.closeEditDialog,
    handleDownload: crudHandlers.handleDownload,
    handleSaveContent: crudHandlers.handleSaveContent,
    handleConfirmDelete: crudHandlers.handleConfirmDelete,
    deleteContentById: crudHandlers.deleteContentById,
  };
}
