"use client";

import type { ReactElement } from "react";
import {
  IconBolt,
  IconFileText,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";
import { ContentGrid } from "@/components/content/content-grid";
import { CreateContentDialog } from "@/components/content/create-content-dialog";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import { DashboardPage } from "@/components/layout/dashboard-page";
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
import { PdfCropDialog } from "./_components/pdf-crop-dialog";
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
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <ContentFilterPopover
                statusFilter={controller.filters.statusFilter}
                typeFilter={controller.filters.typeFilter}
                filteredResultsCount={controller.data?.total ?? 0}
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

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {controller.visibleContents.length === 0 ? (
              <EmptyState
                title="No content yet"
                description="Upload images, videos, or create flash and text content to get started."
                action={
                  <Can permission="content:create">
                    <Button
                      onClick={() => controller.setIsCreateDialogOpen(true)}
                    >
                      <IconPlus className="size-4" />
                      Create Content
                    </Button>
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
              />
            )}
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
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

      <PdfCropDialog
        session={controller.pdfCropSession}
        onSubmit={controller.handleCropSubmit}
        onCancel={controller.handleCropCancel}
      />
    </DashboardPage.Root>
  );
}
