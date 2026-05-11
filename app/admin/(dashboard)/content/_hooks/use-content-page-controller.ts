"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/context/auth-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteUserOptions } from "@/hooks/use-infinite-user-options";
import {
  contentApi,
  type BackendContentListResponse,
  type ContentListQuery,
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
  useListContentQuery,
  useUploadPdfMutation,
} from "@/lib/api/content-api";
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
    ownerId: query.ownerId ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
  });
}

function toContentSortQuery(
  sortFilter: ReturnType<typeof useContentPageFilters>["sortFilter"],
): {
  sortBy: NonNullable<ContentListQuery["sortBy"]>;
  sortDirection: NonNullable<ContentListQuery["sortDirection"]>;
} {
  if (sortFilter === "oldest") {
    return { sortBy: "createdAt", sortDirection: "asc" };
  }
  if (sortFilter === "title-asc") {
    return { sortBy: "title", sortDirection: "asc" };
  }
  if (sortFilter === "title-desc") {
    return { sortBy: "title", sortDirection: "desc" };
  }
  if (sortFilter === "file-size-asc") {
    return { sortBy: "fileSize", sortDirection: "asc" };
  }
  if (sortFilter === "file-size-desc") {
    return { sortBy: "fileSize", sortDirection: "desc" };
  }
  return { sortBy: "createdAt", sortDirection: "desc" };
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
  const canReadUsers = useCan("users:read");
  const { user } = useAuth();
  const filters = useContentPageFilters();
  const canFilterByOwner = user?.isAdmin === true && canReadUsers;
  const [ownerSearch, setOwnerSearch] = useState("");
  const debouncedOwnerSearch = useDebounce(ownerSearch.trim(), 250);
  const selectedOwnerId =
    filters.ownerFilter === "all" ? undefined : filters.ownerFilter;
  const {
    users: ownerOptions,
    isFetching: isOwnerOptionsFetching,
    isLoadingMore: isOwnerOptionsLoadingMore,
    hasMore: hasMoreOwnerOptions,
    loadMore: loadMoreOwnerOptions,
  } = useInfiniteUserOptions({
    enabled: canFilterByOwner,
    search: debouncedOwnerSearch,
    pageSize: 50,
    selectedUserId: selectedOwnerId,
  });
  const dialogState = useContentDialogState();
  const debouncedSearch = useDebounce(filters.search, 500);
  const sortQuery = toContentSortQuery(filters.sortFilter);
  const queryArgs: ContentListQuery = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    status: filters.statusFilter === "all" ? undefined : filters.statusFilter,
    type: filters.typeFilter === "all" ? undefined : filters.typeFilter,
    ownerId: filters.ownerFilter === "all" ? undefined : filters.ownerFilter,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
    sortBy: sortQuery.sortBy,
    sortDirection: sortQuery.sortDirection,
  };
  const isInitialListQuery =
    initialList != null &&
    normalizedQueryKey(initialList.queryArgs) === normalizedQueryKey(queryArgs);

  const {
    data: queriedData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isError,
    error,
  } = useListContentQuery(queryArgs, {
    pollingInterval: POLLING_FALLBACK_INTERVAL_MS,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const cachedInitialList = contentApi.endpoints.listContent.useQueryState(
    queryArgs,
    {
      skip: !isInitialListQuery,
    },
  );
  const data = isInitialListQuery
    ? (cachedInitialList.data ?? initialList?.data)
    : queriedData;
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
    canFilterByOwner,
    ownerOptions,
    ownerSearch,
    isOwnerOptionsFetching,
    isOwnerOptionsLoadingMore,
    hasMoreOwnerOptions,
    loadMoreOwnerOptions,
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
    handleOwnerSearchChange: setOwnerSearch,
  };
}
