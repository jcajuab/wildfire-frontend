"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconEye, IconPlus } from "@tabler/icons-react";

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
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { TypeFilter } from "@/components/content/content-filter-popover";
import type { StatusFilter } from "@/components/content/content-status-tabs";
import type { Content, ContentSortField } from "@/types/content";

const CONTENT_STATUS_VALUES = ["all", "DRAFT", "IN_USE"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "PDF"] as const;
const CONTENT_SORT_VALUES = ["recent", "title", "size", "type"] as const;

const mockContents: Content[] = [];

interface EditContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (contentId: string, title: string) => void;
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
  readonly onSave: (contentId: string, title: string) => void;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
}: EditContentDialogFormProps): ReactElement {
  const [title, setTitle] = useState(content.title);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Content</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="edit-content-title">Title</Label>
        <Input
          id="edit-content-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(content.id, title.trim());
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
            Content Preview
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
    "recent",
    CONTENT_SORT_VALUES,
  );
  const [search, setSearch] = useQueryStringState("q", "");
  const [page, setPage] = useQueryNumberState("page", 1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contents, setContents] = useState<Content[]>(mockContents);
  const [contentToPreview, setContentToPreview] = useState<Content | null>(
    null,
  );
  const [contentToEdit, setContentToEdit] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const pageSize = 20;

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

  const handleCreateFromScratch = useCallback((name: string) => {
    const newContent: Content = {
      id: crypto.randomUUID(),
      title: name,
      type: "PDF",
      mimeType: "application/pdf",
      fileSize: 0,
      checksum: "",
      width: null,
      height: null,
      duration: null,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      createdBy: {
        id: "1",
        name: "Admin",
      },
    };
    setContents((prev) => [newContent, ...prev]);
  }, []);

  const handleUploadFile = useCallback((name: string, file: File) => {
    const newContent: Content = {
      id: crypto.randomUUID(),
      title: name,
      type: "PDF",
      mimeType: file.type,
      fileSize: file.size,
      checksum: "",
      width: null,
      height: null,
      duration: null,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      createdBy: {
        id: "1",
        name: "Admin",
      },
    };
    setContents((prev) => [newContent, ...prev]);
  }, []);

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

  const filteredContents = useMemo(
    () =>
      contents.filter((content) => {
        if (statusFilter !== "all" && content.status !== statusFilter) {
          return false;
        }

        if (typeFilter !== "all" && content.type !== typeFilter) {
          return false;
        }

        if (
          search.length > 0 &&
          !content.title.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }

        return true;
      }),
    [contents, statusFilter, typeFilter, search],
  );

  const sortedContents = useMemo(
    () =>
      [...filteredContents].sort((a, b) => {
        switch (sortBy) {
          case "title":
            return a.title.localeCompare(b.title);
          case "size":
            return b.fileSize - a.fileSize;
          case "type":
            return a.type.localeCompare(b.type);
          case "recent":
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      }),
    [filteredContents, sortBy],
  );

  const paginatedContents = useMemo(
    () => sortedContents.slice((page - 1) * pageSize, page * pageSize),
    [sortedContents, page],
  );

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
            items={paginatedContents}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onDelete={handleDelete}
            canUpdate={canUpdateContent}
            canDelete={canDeleteContent}
          />
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={sortedContents.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <CreateContentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateFromScratch={handleCreateFromScratch}
        onUploadFile={handleUploadFile}
      />

      <EditContentDialog
        content={contentToEdit}
        open={contentToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setContentToEdit(null);
        }}
        onSave={(contentId, title) => {
          setContents((prev) =>
            prev.map((content) =>
              content.id === contentId ? { ...content, title } : content,
            ),
          );
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
        onConfirm={() => {
          if (!contentToDelete) return;
          setContents((prev) =>
            prev.filter((content) => content.id !== contentToDelete.id),
          );
          setContentToDelete(null);
        }}
      />
    </DashboardPage.Root>
  );
}
