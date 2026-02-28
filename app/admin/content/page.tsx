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
import { DashboardPage } from "@/components/layout";
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
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useDeleteContentMutation,
  useListContentQuery,
  useReplaceContentFileMutation,
  useUploadContentMutation,
  useUpdateContentMutation,
  useLazyGetContentFileUrlQuery,
} from "@/lib/api/content-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { formatContentStatus } from "@/lib/formatters";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { TypeFilter } from "@/components/content/content-filter-popover";
import type { StatusFilter } from "@/components/content/content-status-tabs";
import type { Content, ContentSortField } from "@/types/content";

const CONTENT_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "PDF"] as const;
const CONTENT_SORT_VALUES = ["createdAt", "title", "fileSize", "type"] as const;

interface EditContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: {
    contentId: string;
    title: string;
    status: "DRAFT" | "IN_USE";
    file: File | null;
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
    status: "DRAFT" | "IN_USE";
    file: File | null;
  }) => Promise<void>;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
}: EditContentDialogFormProps): ReactElement {
  const [title, setTitle] = useState(content.title);
  const [status, setStatus] = useState<"DRAFT" | "IN_USE">(content.status);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canReplaceFile = content.status === "DRAFT";

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
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "DRAFT" | "IN_USE")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="IN_USE">In Use</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Replace File</Label>
          <p className="text-xs text-muted-foreground">
            Current file type: {content.type} ({content.mimeType || "Unknown"})
          </p>
          {canReplaceFile ? (
            <>
              <p className="text-xs text-muted-foreground">
                Optional: choose a new file to replace it.
              </p>
              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
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
              Set status to Draft to replace the file.
            </p>
          )}
        </div>
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
                status,
                file: selectedFile,
              });
              onOpenChange(false);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={title.trim().length === 0 || isSaving}
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
            {content.fileSize.toLocaleString()} bytes
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
  const canUpdateContent = useCan("content:update");
  const canDeleteContent = useCan("content:delete");
  const canDownloadContent = useCan("content:download");
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
  const [uploadContent] = useUploadContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [replaceContentFile] = useReplaceContentFileMutation();
  const [getContentFileUrl] = useLazyGetContentFileUrlQuery();

  const visibleContents = useMemo(
    () => (data?.items ?? []).map(mapBackendContentToContent),
    [data?.items],
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
    async (name: string, file: File) => {
      try {
        await uploadContent({ title: name, file }).unwrap();
        toast.success("Content uploaded.");
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to upload content."));
      }
    },
    [uploadContent],
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
        toast.error(getApiErrorMessage(err, "Failed to get download URL."));
      }
    },
    [getContentFileUrl],
  );

  if (isLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Content" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading content...</p>
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
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-destructive">
              {getApiErrorMessage(
                error,
                "Failed to load content. Check the API and try again.",
              )}
            </p>
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
        <DashboardPage.Toolbar>
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
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <ContentGrid
            items={visibleContents}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onDelete={handleDelete}
            onDownload={handleDownload}
            canUpdate={canUpdateContent}
            canDelete={canDeleteContent}
            canDownload={canDownloadContent}
          />
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
      />

      <EditContentDialog
        content={contentToEdit}
        open={contentToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setContentToEdit(null);
        }}
        onSave={async ({ contentId, title, status, file }) => {
          try {
            if (file) {
              await replaceContentFile({
                id: contentId,
                file,
                title,
                status,
              }).unwrap();
              toast.success("Content file replaced.");
              return;
            }

            await updateContent({ id: contentId, title, status }).unwrap();
            toast.success("Content updated.");
          } catch (err) {
            toast.error(
              getApiErrorMessage(
                err,
                file
                  ? "Failed to replace content file."
                  : "Failed to update content.",
              ),
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
        onConfirm={async () => {
          if (!contentToDelete) return;
          try {
            await deleteContent(contentToDelete.id).unwrap();
            toast.success("Content deleted.");
            setContentToDelete(null);
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to delete content."));
            throw err;
          }
        }}
      />
    </DashboardPage.Root>
  );
}
