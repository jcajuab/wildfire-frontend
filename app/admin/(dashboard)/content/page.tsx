"use client";

import type { ReactElement } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";
import { ContentGrid } from "@/components/content/content-grid";
import { CreateContentDialog } from "@/components/content/create-content-dialog";
import { Pagination } from "@/components/content/pagination";
import { ContentSearchInput } from "@/components/content/content-search-input";
import { ContentSortSelect } from "@/components/content/content-sort-select";
import { ContentStatusTabs } from "@/components/content/content-status-tabs";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import {
  EditContentDialog,
  PreviewContentDialog,
} from "./_components/content-page-dialogs";
import { useContentPageController } from "./_hooks/use-content-page-controller";

export default function ContentPage(): ReactElement {
  const controller = useContentPageController();

  if (controller.isLoading) {
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

  if (controller.isError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Content" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">{controller.errorMessage}</p>
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
            <Button onClick={() => controller.setIsCreateDialogOpen(true)}>
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
              value={controller.filters.statusFilter}
              onValueChange={controller.filters.handleStatusFilterChange}
            />

            <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
              <ContentFilterPopover
                typeFilter={controller.filters.typeFilter}
                onTypeFilterChange={controller.filters.handleTypeFilterChange}
              />
              <ContentSortSelect
                value={controller.filters.sortBy}
                onValueChange={controller.filters.handleSortChange}
              />
              <ContentSearchInput
                value={controller.filters.search}
                onChange={controller.filters.handleSearchChange}
                className="w-full max-w-none md:w-72"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            <ContentGrid
              items={controller.visibleContents}
              expandedPdfParentIds={controller.pdfState.expandedPdfParentIds}
              pageCollectionsByParentId={
                controller.pdfState.pageCollectionsByParentId
              }
              updatingPageId={controller.pdfState.updatingPageId}
              onTogglePdfExpand={controller.pdfState.handleTogglePdfExpand}
              onLoadMorePages={controller.pdfState.handleLoadMorePages}
              onRetryLoadPages={controller.pdfState.handleRetryLoadPages}
              onTogglePageExclusion={
                controller.canUpdateContent
                  ? controller.pdfState.handleTogglePageExclusion
                  : undefined
              }
              onEdit={
                controller.canUpdateContent ? controller.handleEdit : undefined
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
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <Pagination
            page={controller.filters.page}
            pageSize={controller.pageSize}
            total={controller.data?.total ?? 0}
            onPageChange={controller.filters.setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <CreateContentDialog
        open={controller.isCreateDialogOpen}
        onOpenChange={controller.setIsCreateDialogOpen}
        onUploadFile={controller.handleUploadFile}
        onCreateFlash={controller.handleCreateFlash}
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
    </DashboardPage.Root>
  );
}
