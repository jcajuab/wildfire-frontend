"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import {
  IconBolt,
  IconFileText,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { Can } from "@/components/common/can";
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
import { useAppDispatch } from "@/lib/hooks";
import { useContentPageController } from "./_hooks/use-content-page-controller";

export function ContentListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: ContentListQuery;
  readonly data: BackendContentListResponse;
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(contentApi.util.upsertQueryData("listContent", queryArgs, data));
  }, [dispatch, queryArgs, data]);
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
  useLayoutEffect(() => {
    dispatch(
      contentApi.util.upsertQueryData("getContentOptions", queryArgs, data),
    );
  }, [dispatch, queryArgs, data]);
  return null;
}

export function ContentPageView(): ReactElement {
  const controller = useContentPageController();

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
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
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
    </div>
  );
}
