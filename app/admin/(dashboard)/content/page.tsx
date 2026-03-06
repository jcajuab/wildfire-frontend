"use client";

import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconEye, IconPlus, IconUpload } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";
import {
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
import { ContentGrid } from "@/components/content/content-grid";
import { CreateContentDialog } from "@/components/content/create-content-dialog";
import { Pagination } from "@/components/content/pagination";
import { ContentSearchInput } from "@/components/content/content-search-input";
import { ContentSortSelect } from "@/components/content/content-sort-select";
import { ContentStatusTabs } from "@/components/content/content-status-tabs";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  type BackendContentJob,
  contentApi,
  useCreateFlashContentMutation,
  useDeleteContentMutation,
  useLazyGetContentJobQuery,
  useLazyGetContentFileUrlQuery,
  useLazyListContentQuery,
  useListContentQuery,
  useReplaceContentFileMutation,
  useSetContentExclusionMutation,
  useUploadContentMutation,
  useUpdateContentMutation,
} from "@/lib/api/content-api";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import { formatContentStatus, formatFileSize } from "@/lib/formatters";
import { useAppDispatch } from "@/lib/hooks";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { TypeFilter } from "@/components/content/content-filter-popover";
import type { StatusFilter } from "@/components/content/content-status-tabs";
import type { Content, ContentSortField } from "@/types/content";

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "PDF", "FLASH"] as const;
const CONTENT_SORT_VALUES = ["createdAt", "title", "fileSize", "type"] as const;
const CONTENT_JOB_WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const CONTENT_PAGES_SHEET_PAGE_SIZE = 100;
const DEFAULT_PDF_EXPAND_MODE = "single" as const;
type PdfExpandMode = "single" | "multi";

interface PageCollectionState {
  readonly items: readonly Content[];
  readonly total: number;
  readonly page: number;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly errorMessage: string | null;
}

const EMPTY_PAGE_COLLECTION: PageCollectionState = {
  items: [],
  total: 0,
  page: 0,
  isLoading: false,
  isLoadingMore: false,
  errorMessage: null,
};

const mergePageItems = (
  existingItems: readonly Content[],
  incomingItems: readonly Content[],
): readonly Content[] => {
  const merged = [...existingItems];
  for (const item of incomingItems) {
    const index = merged.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
      merged.push(item);
      continue;
    }
    merged[index] = item;
  }
  return merged.sort((left, right) => {
    const leftPage = left.pageNumber ?? 0;
    const rightPage = right.pageNumber ?? 0;
    if (leftPage !== rightPage) {
      return leftPage - rightPage;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
};

const buildContentJobStreamUrl = (jobId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/content-jobs/${encodeURIComponent(jobId)}/events`;
};

const waitForContentJob = async (input: {
  jobId: string;
  fetchJob: (jobId: string) => Promise<BackendContentJob>;
}): Promise<BackendContentJob> => {
  return new Promise<BackendContentJob>((resolve, reject) => {
    const streamUrl = buildContentJobStreamUrl(input.jobId);
    const source = new EventSource(streamUrl, { withCredentials: true });
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      source.close();
    };
    const settleFromTerminalJob = (job: BackendContentJob): boolean => {
      if (job.status !== "SUCCEEDED" && job.status !== "FAILED") {
        return false;
      }
      if (settled) {
        return true;
      }
      settled = true;
      cleanup();
      if (job.status === "FAILED") {
        reject(new Error(job.errorMessage ?? "Content ingestion failed"));
        return true;
      }
      resolve(job);
      return true;
    };
    const rejectError = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const handleJobPayload = (payload: unknown) => {
      if (payload == null || typeof payload !== "object") {
        return;
      }
      const maybeJob = payload as Partial<BackendContentJob>;
      const maybeJobId =
        typeof maybeJob.id === "string"
          ? maybeJob.id
          : typeof (payload as { jobId?: unknown }).jobId === "string"
            ? String((payload as { jobId?: unknown }).jobId)
            : null;
      if (
        typeof maybeJob.status !== "string" ||
        maybeJobId === null ||
        typeof maybeJob.contentId !== "string"
      ) {
        return;
      }
      settleFromTerminalJob({
        id: maybeJobId,
        contentId: maybeJob.contentId,
        operation: maybeJob.operation ?? "UPLOAD",
        status: maybeJob.status as BackendContentJob["status"],
        errorMessage: maybeJob.errorMessage ?? null,
        createdById: maybeJob.createdById ?? "",
        createdAt: maybeJob.createdAt ?? "",
        updatedAt: maybeJob.updatedAt ?? "",
        startedAt: maybeJob.startedAt ?? null,
        completedAt: maybeJob.completedAt ?? null,
      });
    };

    timeout = setTimeout(() => {
      rejectError(new Error("Timed out waiting for content ingestion"));
    }, CONTENT_JOB_WAIT_TIMEOUT_MS);

    source.addEventListener("snapshot", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        // Ignore malformed events; terminal fallback is timeout polling.
      }
    });
    source.addEventListener("succeeded", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        void input
          .fetchJob(input.jobId)
          .then((job) => {
            settleFromTerminalJob(job);
          })
          .catch((error) => rejectError(error));
      }
    });
    source.addEventListener("failed", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        void input
          .fetchJob(input.jobId)
          .then((job) => {
            settleFromTerminalJob(job);
          })
          .catch((error) => rejectError(error));
      }
    });
    source.onerror = () => {
      void input
        .fetchJob(input.jobId)
        .then((job) => {
          settleFromTerminalJob(job);
        })
        .catch((error) => rejectError(error));
    };
  });
};

interface EditContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: {
    contentId: string;
    title: string;
    file: File | null;
    flashMessage: string | null;
    flashTone: "INFO" | "WARNING" | "CRITICAL" | null;
    scrollPxPerSecond: number | null;
  }) => Promise<void>;
}

function EditContentDialog({
  content,
  open,
  onOpenChange,
  onSave,
}: EditContentDialogProps): ReactElement | null {
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <EditContentDialogForm
          key={content.id}
          content={content}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditContentDialogFormProps {
  readonly content: Content;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: {
    contentId: string;
    title: string;
    file: File | null;
    flashMessage: string | null;
    flashTone: "INFO" | "WARNING" | "CRITICAL" | null;
    scrollPxPerSecond: number | null;
  }) => Promise<void>;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
}: EditContentDialogFormProps): ReactElement {
  const [title, setTitle] = useState(content.title);
  const [flashMessage, setFlashMessage] = useState(content.flashMessage ?? "");
  const [flashTone, setFlashTone] = useState<"INFO" | "WARNING" | "CRITICAL">(
    content.flashTone ?? "INFO",
  );
  const [scrollPxPerSecond, setScrollPxPerSecond] = useState(
    content.scrollPxPerSecond?.toString() ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canReplaceFile =
    content.kind === "ROOT" && content.status !== "PROCESSING";
  const isFlashContent = content.type === "FLASH";
  const supportsScrollSpeed =
    content.type === "IMAGE" || content.type === "PDF";

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Content</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="edit-content-title">Title</Label>
          <Input
            id="edit-content-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {isFlashContent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-message">Ticker Message</Label>
              <Textarea
                id="edit-flash-message"
                value={flashMessage}
                onChange={(event) => setFlashMessage(event.target.value)}
                maxLength={240}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-tone">Tone</Label>
              <Select
                value={flashTone}
                onValueChange={(value) =>
                  setFlashTone(value as "INFO" | "WARNING" | "CRITICAL")
                }
              >
                <SelectTrigger id="edit-flash-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {supportsScrollSpeed ? (
              <div className="space-y-2">
                <Label htmlFor="edit-content-scroll-speed">
                  Scroll Speed (px/s)
                </Label>
                <Input
                  id="edit-content-scroll-speed"
                  type="number"
                  min={1}
                  value={scrollPxPerSecond}
                  onChange={(event) => setScrollPxPerSecond(event.target.value)}
                  placeholder="Leave empty to use default"
                />
              </div>
            ) : null}
            <Label>Replace File</Label>
            <p className="text-xs text-muted-foreground">
              Current file type: {content.type} ({content.mimeType || "Unknown"}
              )
            </p>
            {canReplaceFile ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Optional: choose a new file to replace it.
                </p>
                <div
                  className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <IconUpload className="size-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm">
                      <label
                        htmlFor={`edit-content-file-${content.id}`}
                        className="cursor-pointer font-medium text-primary hover:underline"
                      >
                        Choose a file
                      </label>{" "}
                      or drag it here.
                    </p>
                    <input
                      id={`edit-content-file-${content.id}`}
                      type="file"
                      className="sr-only"
                      accept={SUPPORTED_CONTENT_FILE_MIME_TYPES}
                      onChange={handleFileInputChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported files: {SUPPORTED_CONTENT_FILE_LABELS}
                    </p>
                  </div>
                  {selectedFile && (
                    <p className="text-xs font-medium text-primary">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {content.kind === "PAGE"
                  ? "Page items can be renamed but cannot replace files directly."
                  : "Processing content cannot be replaced right now."}
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setIsSaving(true);
            try {
              await onSave({
                contentId: content.id,
                title: title.trim(),
                file: selectedFile,
                flashMessage: isFlashContent ? flashMessage.trim() : null,
                flashTone: isFlashContent ? flashTone : null,
                scrollPxPerSecond: supportsScrollSpeed
                  ? (() => {
                      if (scrollPxPerSecond.trim().length === 0) {
                        return null;
                      }
                      const raw = Number(scrollPxPerSecond);
                      if (!Number.isFinite(raw) || raw <= 0) {
                        return null;
                      }
                      return Math.trunc(raw);
                    })()
                  : null,
              });
              onOpenChange(false);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={
            title.trim().length === 0 ||
            (isFlashContent && flashMessage.trim().length === 0) ||
            isSaving
          }
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

interface PreviewContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function PreviewContentDialog({
  content,
  open,
  onOpenChange,
}: PreviewContentDialogProps): ReactElement | null {
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconEye className="size-4" />
            Content Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Title:</span>{" "}
            {content.title}
          </p>
          <p>
            <span className="text-muted-foreground">Type:</span> {content.type}
          </p>
          <p>
            <span className="text-muted-foreground">MIME Type:</span>{" "}
            {content.mimeType || "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Size:</span>{" "}
            {formatFileSize(content.fileSize)}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            {formatContentStatus(content.status)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContentPage(): ReactElement {
  const dispatch = useAppDispatch();
  const canUpdateContent = useCan("content:update");
  const canDeleteContent = useCan("content:delete");
  const canDownloadContent = useCan("content:read");
  const [statusFilter, setStatusFilter] = useQueryEnumState<StatusFilter>(
    "status",
    "all",
    CONTENT_STATUS_VALUES,
  );
  const [typeFilter, setTypeFilter] = useQueryEnumState<TypeFilter>(
    "type",
    "all",
    CONTENT_TYPE_VALUES,
  );
  const [sortBy, setSortBy] = useQueryEnumState<ContentSortField>(
    "sort",
    "createdAt",
    CONTENT_SORT_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contentToPreview, setContentToPreview] = useState<Content | null>(
    null,
  );
  const [contentToEdit, setContentToEdit] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const pdfExpandMode: PdfExpandMode = DEFAULT_PDF_EXPAND_MODE;
  const [expandedPdfParentIds, setExpandedPdfParentIds] = useState<string[]>(
    [],
  );
  const [pageCollectionsByParentId, setPageCollectionsByParentId] = useState<
    Record<string, PageCollectionState>
  >({});
  const [updatingPageId, setUpdatingPageId] = useState<string | null>(null);
  const pageSize = 20;
  const { data, isLoading, isError, error } = useListContentQuery({
    page,
    pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    search: search.trim().length > 0 ? search : undefined,
    sortBy,
    sortDirection: "desc",
  });
  const [triggerListContent] = useLazyListContentQuery();
  const [uploadContent] = useUploadContentMutation();
  const [createFlashContent] = useCreateFlashContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [setContentExclusion] = useSetContentExclusionMutation();
  const [replaceContentFile] = useReplaceContentFileMutation();
  const [getContentFileUrl] = useLazyGetContentFileUrlQuery();
  const [getContentJob] = useLazyGetContentJobQuery();
  const visibleContents = useMemo(
    () => (data?.items ?? []).map(mapBackendContentToContent),
    [data?.items],
  );

  const loadPageBatch = useCallback(
    async (input: { parentId: string; page: number; append: boolean }) => {
      setPageCollectionsByParentId((previous) => {
        const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
        return {
          ...previous,
          [input.parentId]: {
            ...current,
            isLoading: !input.append,
            isLoadingMore: input.append,
            errorMessage: null,
          },
        };
      });

      try {
        const response = await triggerListContent({
          page: input.page,
          pageSize: CONTENT_PAGES_SHEET_PAGE_SIZE,
          parentId: input.parentId,
          sortBy: "pageNumber",
          sortDirection: "asc",
        }).unwrap();
        const incomingItems = response.items.map(mapBackendContentToContent);
        setPageCollectionsByParentId((previous) => {
          const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
          return {
            ...previous,
            [input.parentId]: {
              ...current,
              items: input.append
                ? mergePageItems(current.items, incomingItems)
                : mergePageItems([], incomingItems),
              total: response.total,
              page: response.page,
              isLoading: false,
              isLoadingMore: false,
              errorMessage: null,
            },
          };
        });
      } catch (error) {
        setPageCollectionsByParentId((previous) => {
          const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
          return {
            ...previous,
            [input.parentId]: {
              ...current,
              isLoading: false,
              isLoadingMore: false,
              errorMessage: getApiErrorMessage(
                error,
                "Failed to load PDF pages.",
              ),
            },
          };
        });
      }
    },
    [triggerListContent],
  );

  const handleStatusFilterChange = useCallback(
    (value: StatusFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  const handleTypeFilterChange = useCallback(
    (value: TypeFilter) => {
      setTypeFilter(value);
      setPage(1);
    },
    [setTypeFilter, setPage],
  );

  const handleSortChange = useCallback(
    (value: ContentSortField) => {
      setSortBy(value);
      setPage(1);
    },
    [setSortBy, setPage],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleUploadFile = useCallback(
    async (name: string, file: File, scrollPxPerSecond?: number) => {
      try {
        const accepted = await uploadContent({
          title: name,
          file,
          scrollPxPerSecond,
        }).unwrap();
        toast.message("Content upload queued.");
        void waitForContentJob({
          jobId: accepted.job.id,
          fetchJob: (jobId) => getContentJob(jobId).unwrap(),
        })
          .then(() => {
            dispatch(
              contentApi.util.invalidateTags([
                { type: "Content", id: "LIST" },
                { type: "Content", id: accepted.content.id },
              ]),
            );
            toast.success("Content uploaded.");
          })
          .catch((error) => {
            notifyApiError(error, "Content ingestion failed.");
          });
      } catch (err) {
        notifyApiError(err, "Failed to upload content.");
      }
    },
    [dispatch, getContentJob, uploadContent],
  );

  const handleCreateFlash = useCallback(
    async (input: {
      title: string;
      message: string;
      tone: "INFO" | "WARNING" | "CRITICAL";
    }) => {
      try {
        await createFlashContent(input).unwrap();
        toast.success("Flash content created.");
      } catch (error) {
        notifyApiError(error, "Failed to create flash content.");
      }
    },
    [createFlashContent],
  );

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

  const handleTogglePdfExpand = useCallback(
    (content: Content) => {
      if (
        content.type !== "PDF" ||
        content.kind !== "ROOT" ||
        content.status !== "READY"
      ) {
        return;
      }

      const isExpanded = expandedPdfParentIds.includes(content.id);
      if (isExpanded) {
        setExpandedPdfParentIds((previous) =>
          previous.filter((id) => id !== content.id),
        );
        return;
      }

      setExpandedPdfParentIds((previous) => {
        if (pdfExpandMode === "single") {
          return [content.id];
        }
        return [...previous, content.id];
      });

      const currentCollection = pageCollectionsByParentId[content.id];
      const shouldLoadInitialPages =
        !currentCollection ||
        (currentCollection.items.length === 0 &&
          !currentCollection.isLoading &&
          !currentCollection.isLoadingMore) ||
        currentCollection.errorMessage !== null;

      if (shouldLoadInitialPages) {
        void loadPageBatch({ parentId: content.id, page: 1, append: false });
      }
    },
    [
      expandedPdfParentIds,
      loadPageBatch,
      pageCollectionsByParentId,
      pdfExpandMode,
    ],
  );

  const handleLoadMorePages = useCallback(
    async (parentId: string) => {
      const currentCollection = pageCollectionsByParentId[parentId];
      if (!currentCollection) {
        await loadPageBatch({ parentId, page: 1, append: false });
        return;
      }
      if (
        currentCollection.isLoading ||
        currentCollection.isLoadingMore ||
        currentCollection.items.length >= currentCollection.total
      ) {
        return;
      }
      await loadPageBatch({
        parentId,
        page: currentCollection.page + 1,
        append: true,
      });
    },
    [loadPageBatch, pageCollectionsByParentId],
  );

  const handleRetryLoadPages = useCallback(
    async (parentId: string) => {
      await loadPageBatch({ parentId, page: 1, append: false });
    },
    [loadPageBatch],
  );

  const handleTogglePageExclusion = useCallback(
    async (pageContent: Content, isExcluded: boolean) => {
      const parentContentId = pageContent.parentContentId;
      if (!parentContentId) {
        return;
      }
      const previousIsExcluded = pageContent.isExcluded;
      const previousCollection = pageCollectionsByParentId[parentContentId];
      setUpdatingPageId(pageContent.id);
      setPageCollectionsByParentId((previous) => {
        const current = previous[parentContentId];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [parentContentId]: {
            ...current,
            items: current.items.map((item) =>
              item.id === pageContent.id ? { ...item, isExcluded } : item,
            ),
          },
        };
      });
      try {
        const updatedPage = mapBackendContentToContent(
          await setContentExclusion({
            id: pageContent.id,
            isExcluded,
          }).unwrap(),
        );
        setPageCollectionsByParentId((previous) => {
          const current = previous[parentContentId];
          if (!current) {
            return previous;
          }
          return {
            ...previous,
            [parentContentId]: {
              ...current,
              items: current.items.map((item) =>
                item.id === updatedPage.id ? updatedPage : item,
              ),
            },
          };
        });
        const tags = [
          { type: "Content" as const, id: "LIST" },
          { type: "Content" as const, id: pageContent.id },
        ];
        if (parentContentId) {
          tags.push({
            type: "Content" as const,
            id: parentContentId,
          });
        }
        dispatch(contentApi.util.invalidateTags(tags));
        toast.success(
          isExcluded
            ? "Page excluded from playback."
            : "Page included in playback.",
        );
      } catch (err) {
        setPageCollectionsByParentId((previous) => {
          const current = previous[parentContentId];
          if (!current) {
            return previous;
          }
          if (previousCollection === undefined) {
            return {
              ...previous,
              [parentContentId]: {
                ...current,
                items: current.items.map((item) =>
                  item.id === pageContent.id
                    ? { ...item, isExcluded: previousIsExcluded }
                    : item,
                ),
              },
            };
          }
          return {
            ...previous,
            [parentContentId]: previousCollection,
          };
        });
        notifyApiError(err, "Failed to update page exclusion.");
      } finally {
        setUpdatingPageId(null);
      }
    },
    [dispatch, pageCollectionsByParentId, setContentExclusion],
  );

  const handleDownload = useCallback(
    async (content: Content) => {
      try {
        const { downloadUrl } = await getContentFileUrl(content.id).unwrap();
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.rel = "noopener noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        notifyApiError(err, "Failed to get download URL.");
      }
    },
    [getContentFileUrl],
  );
  if (isLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Content" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-muted-foreground">Loading content...</p>
            </div>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  if (isError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Content" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                {getApiErrorMessage(
                  error,
                  "Failed to load content. Check the API and try again.",
                )}
              </p>
            </div>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Content"
        actions={
          <Can permission="content:create">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <IconPlus className="size-4" />
              Create Content
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <ContentStatusTabs
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            />

            <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
              <ContentFilterPopover
                typeFilter={typeFilter}
                onTypeFilterChange={handleTypeFilterChange}
              />
              <ContentSortSelect
                value={sortBy}
                onValueChange={handleSortChange}
              />
              <ContentSearchInput
                value={search}
                onChange={handleSearchChange}
                className="w-full max-w-none md:w-72"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            <ContentGrid
              items={visibleContents}
              expandedPdfParentIds={expandedPdfParentIds}
              pageCollectionsByParentId={pageCollectionsByParentId}
              updatingPageId={updatingPageId}
              onTogglePdfExpand={handleTogglePdfExpand}
              onLoadMorePages={handleLoadMorePages}
              onRetryLoadPages={handleRetryLoadPages}
              onTogglePageExclusion={
                canUpdateContent ? handleTogglePageExclusion : undefined
              }
              onEdit={canUpdateContent ? handleEdit : undefined}
              onPreview={handlePreview}
              onDelete={canDeleteContent ? handleDelete : undefined}
              onDownload={canDownloadContent ? handleDownload : undefined}
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <CreateContentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onUploadFile={handleUploadFile}
        onCreateFlash={handleCreateFlash}
      />

      <EditContentDialog
        content={contentToEdit}
        open={contentToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setContentToEdit(null);
        }}
        onSave={async ({
          contentId,
          title,
          file,
          flashMessage,
          flashTone,
          scrollPxPerSecond,
        }) => {
          const editedContent = contentToEdit;
          const parentContentIdForRollback =
            editedContent?.id === contentId
              ? editedContent.parentContentId
              : null;
          const previousCollection = parentContentIdForRollback
            ? pageCollectionsByParentId[parentContentIdForRollback]
            : undefined;

          try {
            if (file) {
              const accepted = await replaceContentFile({
                id: contentId,
                file,
                title,
              }).unwrap();
              toast.message("Content replacement queued.");
              void waitForContentJob({
                jobId: accepted.job.id,
                fetchJob: (jobId) => getContentJob(jobId).unwrap(),
              })
                .then(() => {
                  dispatch(
                    contentApi.util.invalidateTags([
                      { type: "Content", id: "LIST" },
                      { type: "Content", id: accepted.content.id },
                    ]),
                  );
                  toast.success("Content file replaced.");
                })
                .catch((error) => {
                  notifyApiError(
                    error,
                    "Content replacement ingestion failed.",
                  );
                });
              return;
            }
            const parentContentId = parentContentIdForRollback;

            if (parentContentId !== null && previousCollection) {
              setPageCollectionsByParentId((previous) => {
                const current = previous[parentContentId];
                if (!current) {
                  return previous;
                }
                return {
                  ...previous,
                  [parentContentId]: {
                    ...current,
                    items: current.items.map((item) =>
                      item.id === contentId ? { ...item, title } : item,
                    ),
                  },
                };
              });
            }

            const updated = mapBackendContentToContent(
              await updateContent({
                id: contentId,
                title,
                ...(editedContent?.type === "FLASH"
                  ? {
                      flashMessage: flashMessage ?? "",
                      flashTone: flashTone ?? "INFO",
                    }
                  : editedContent?.type === "IMAGE" ||
                      editedContent?.type === "PDF"
                    ? {
                        scrollPxPerSecond,
                      }
                    : {}),
              }).unwrap(),
            );
            const updatedParentContentId = updated.parentContentId;
            if (updatedParentContentId) {
              setPageCollectionsByParentId((previous) => {
                const current = previous[updatedParentContentId];
                if (!current) {
                  return previous;
                }
                return {
                  ...previous,
                  [updatedParentContentId]: {
                    ...current,
                    items: current.items.map((item) =>
                      item.id === updated.id ? updated : item,
                    ),
                  },
                };
              });
            }
            dispatch(
              contentApi.util.invalidateTags([
                { type: "Content", id: "LIST" },
                { type: "Content", id: updated.id },
                ...(updatedParentContentId !== null
                  ? [{ type: "Content" as const, id: updatedParentContentId }]
                  : []),
              ]),
            );
            toast.success("Content updated.");
          } catch (err) {
            if (contentToEdit?.id === contentId) {
              const parentContentId = contentToEdit.parentContentId;
              if (parentContentId) {
                if (previousCollection) {
                  setPageCollectionsByParentId((previous) => ({
                    ...previous,
                    [parentContentId]: previousCollection,
                  }));
                }
              }
            }
            notifyApiError(
              err,
              file
                ? "Failed to replace content file."
                : "Failed to update content.",
            );
            throw err;
          }
        }}
      />

      <PreviewContentDialog
        content={contentToPreview}
        open={contentToPreview !== null}
        onOpenChange={(open) => {
          if (!open) setContentToPreview(null);
        }}
      />

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete content?"
        description={
          contentToDelete
            ? `This will permanently delete "${contentToDelete.title}".`
            : undefined
        }
        confirmLabel="Delete content"
        errorFallback="Failed to delete content."
        onConfirm={async () => {
          if (!contentToDelete) return;
          await deleteContent(contentToDelete.id).unwrap();
          toast.success("Content deleted.");
          setContentToDelete(null);
        }}
      />
    </DashboardPage.Root>
  );
}
