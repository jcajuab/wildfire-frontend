"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconEye, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";
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
  useUploadContentMutation,
  useUpdateContentMutation,
  useLazyGetContentFileUrlQuery,
} from "@/lib/api/content-api";
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
  readonly onSave: (
    contentId: string,
    title: string,
    status: "DRAFT" | "IN_USE",
  ) => void;
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
  readonly onSave: (
    contentId: string,
    title: string,
    status: "DRAFT" | "IN_USE",
  ) => void;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
}: EditContentDialogFormProps): ReactElement {
  const [title, setTitle] = useState(content.title);
  const [status, setStatus] = useState<"DRAFT" | "IN_USE">(content.status);

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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(content.id, title.trim(), status);
            onOpenChange(false);
          }}
          disabled={title.trim().length === 0}
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
            {content.status}
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
  const { data, isLoading, isError } = useListContentQuery({
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
        toast.error(
          err instanceof Error ? err.message : "Failed to upload content.",
        );
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
      } catch {
        toast.error("Failed to get download URL.");
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
              Failed to load content. Check the API and try again.
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
        onSave={async (contentId, title, status) => {
          try {
            await updateContent({ id: contentId, title, status }).unwrap();
            toast.success("Content updated.");
          } catch {
            toast.error("Failed to update content.");
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
            const message =
              err instanceof Error ? err.message : "Failed to delete content.";
            if (message.toLowerCase().includes("used by")) {
              toast.error(
                "Content is still referenced in playlists. Remove those references first.",
              );
            } else {
              toast.error(message);
            }
            throw err;
          }
        }}
      />
    </DashboardPage.Root>
  );
}
