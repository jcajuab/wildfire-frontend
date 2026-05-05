"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  IconBolt,
  IconFileText,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Can } from "@/components/common/can";
import { BulkDeleteConfirmDialog } from "@/components/common/bulk-delete-confirm-dialog";
import { BulkSelectionToolbar } from "@/components/common/bulk-selection-toolbar";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";
import { ContentGrid } from "@/components/content/content-grid";
import { CreateContentDialog } from "@/components/content/create-content-dialog";
import { SearchControl } from "@/components/common/search-control";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditContentDialog,
  PreviewContentDialog,
} from "./_components/content-page-dialogs";
import {
  contentApi,
  type BackendContentListResponse,
  type ContentListQuery,
  type ContentOption,
  type ContentOptionsQueryArg,
} from "@/lib/api/content-api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { runBulkAction } from "@/lib/bulk-action";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useContentPageController } from "./_hooks/use-content-page-controller";

export function ContentListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: ContentListQuery;
  readonly data: BackendContentListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => contentApi.endpoints.listContent.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(contentApi.util.upsertQueryData("listContent", queryArgs, data));
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function ContentOptionsCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: ContentOptionsQueryArg;
  readonly data: ContentOption[];
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      contentApi.endpoints.getContentOptions.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      contentApi.util.upsertQueryData("getContentOptions", queryArgs, data),
    );
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function ContentPageView(): ReactElement {
  const controller = useContentPageController();
  const {
    selectedItems,
    selectedIds,
    selectedCount,
    clearSelection,
    removeSelectedIds,
    setItemSelected,
  } = useBulkSelection();
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { search, statusFilter, typeFilter } = controller.filters;

  useEffect(() => {
    clearSelection();
  }, [clearSelection, search, statusFilter, typeFilter]);

  const selectedContentLabels = selectedItems.map((item) => item.label);
  const selectedContentCount = selectedCount;
  const deleteSelectedLabel =
    selectedContentCount === 1
      ? "Delete 1 content item"
      : `Delete ${selectedContentCount} content items`;

  const handleConfirmBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const result = await runBulkAction(selectedItems, (item) =>
      controller.deleteContentById(item.id),
    );
    removeSelectedIds(result.successfulItems.map((item) => item.id));

    if (result.successfulItems.length > 0) {
      toast.success(
        result.successfulItems.length === 1
          ? "Successfully deleted 1 content item"
          : `Successfully deleted ${result.successfulItems.length} content items`,
      );
    }

    const firstFailure = result.failedItems[0];
    if (firstFailure) {
      const message = getApiErrorMessage(
        firstFailure.error,
        "Some content could not be deleted.",
      );
      toast.error(
        `Failed to delete ${result.failedItems.length} of ${selectedItems.length} content items. ${message}`,
      );
    }
  }, [controller, removeSelectedIds, selectedItems]);

  const handleCancelSelectionMode = useCallback(() => {
    clearSelection();
    setIsSelectionMode(false);
  }, [clearSelection]);

  if (controller.isLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Content" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Loading content...
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (controller.isError) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Content" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">{controller.errorMessage}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Content">
        <Can permission="content:create">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <IconPlus className="size-4" />
                Create Content
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => controller.openCreateDialog("text")}
              >
                <IconFileText className="size-4" />
                Text
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => controller.openCreateDialog("upload")}
              >
                <IconUpload className="size-4" />
                Upload
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => controller.openCreateDialog("flash")}
              >
                <IconBolt className="size-4" />
                Flash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              {isSelectionMode ? (
                <BulkSelectionToolbar
                  selectedCount={selectedContentCount}
                  deleteLabel={deleteSelectedLabel}
                  onDelete={() => setIsBulkDeleteDialogOpen(true)}
                  onCancel={handleCancelSelectionMode}
                />
              ) : null}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                {controller.canDeleteContent && !isSelectionMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    Select mode
                  </Button>
                ) : null}
                <ContentFilterPopover
                  statusFilter={controller.filters.statusFilter}
                  typeFilter={controller.filters.typeFilter}
                  filteredResultsCount={controller.data?.total ?? 0}
                  isFetching={controller.isFetching && !controller.isLoading}
                  onStatusFilterChange={
                    controller.filters.handleStatusFilterChange
                  }
                  onTypeFilterChange={controller.filters.handleTypeFilterChange}
                  onClearFilters={controller.filters.handleClearFilters}
                />
                <SearchControl
                  value={controller.filters.search}
                  onChange={controller.filters.handleSearchChange}
                  ariaLabel="Search content"
                  placeholder="Search..."
                  className="w-full max-w-none sm:w-72"
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {controller.visibleContents.length === 0 ? (
              <EmptyState
                title="No content yet"
                description="Upload images, videos, or create flash and text content to get started."
                action={
                  <Can permission="content:create">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button>
                          <IconPlus className="size-4" />
                          Create Content
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem
                          onClick={() => controller.openCreateDialog("text")}
                        >
                          <IconFileText className="size-4" />
                          Text
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => controller.openCreateDialog("upload")}
                        >
                          <IconUpload className="size-4" />
                          Upload
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => controller.openCreateDialog("flash")}
                        >
                          <IconBolt className="size-4" />
                          Flash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Can>
                }
              />
            ) : (
              <ContentGrid
                items={controller.visibleContents}
                onEdit={
                  controller.canUpdateContent
                    ? controller.handleEdit
                    : undefined
                }
                onPreview={controller.handlePreview}
                onDelete={
                  controller.canDeleteContent
                    ? controller.handleDelete
                    : undefined
                }
                onDownload={
                  controller.canDownloadContent
                    ? controller.handleDownload
                    : undefined
                }
                selectedIds={isSelectionMode ? selectedIds : undefined}
                onSelectionChange={
                  controller.canDeleteContent && isSelectionMode
                    ? (content, checked) =>
                        setItemSelected(
                          { id: content.id, label: content.title },
                          checked,
                        )
                    : undefined
                }
              />
            )}
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          <PaginationFooter
            page={controller.filters.page}
            pageSize={controller.pageSize}
            total={controller.data?.total ?? 0}
            onPageChange={controller.filters.setPage}
            variant="numbered"
          />
        </footer>
      </section>

      <CreateContentDialog
        open={controller.isCreateDialogOpen}
        onOpenChange={controller.setIsCreateDialogOpen}
        mode={controller.createMode ?? "upload"}
        onUploadFile={controller.handleUploadFile}
        onCreateFlash={controller.handleCreateFlash}
        onCreateText={controller.handleCreateText}
      />

      <EditContentDialog
        content={controller.contentToEdit}
        open={controller.contentToEdit !== null}
        onOpenChange={controller.closeEditDialog}
        onSave={controller.handleSaveContent}
      />

      <PreviewContentDialog
        content={controller.contentToPreview}
        open={controller.contentToPreview !== null}
        onOpenChange={controller.closePreviewDialog}
      />

      <ConfirmActionDialog
        open={controller.isDeleteDialogOpen}
        onOpenChange={controller.setIsDeleteDialogOpen}
        title="Delete content?"
        description={
          controller.contentToDelete
            ? `This will permanently delete "${controller.contentToDelete.title}".`
            : undefined
        }
        confirmLabel="Delete content"
        errorFallback="Failed to delete content."
        onConfirm={controller.handleConfirmDelete}
      />

      <BulkDeleteConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedLabels={selectedContentLabels}
        title="Delete selected content?"
        itemName="content item"
        itemNamePlural="content items"
        confirmLabel={deleteSelectedLabel}
        actionDescription="This will permanently delete"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
