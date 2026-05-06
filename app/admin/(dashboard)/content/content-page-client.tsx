"use client";

import type { ReactElement } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  IconBolt,
  IconFileText,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Can } from "@/components/common/can";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { ContentGrid } from "@/components/content/content-grid";
import { ContentToolbar } from "@/components/content/content-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const CreateContentDialog = dynamic(
  () =>
    import("@/components/content/create-content-dialog").then(
      (mod) => mod.CreateContentDialog,
    ),
  { ssr: false },
);

const EditContentDialog = dynamic(
  () =>
    import("./_components/content-page-dialogs").then(
      (mod) => mod.EditContentDialog,
    ),
  { ssr: false },
);

const ConfirmActionDialog = dynamic(
  () =>
    import("@/components/common/confirm-action-dialog").then(
      (mod) => mod.ConfirmActionDialog,
    ),
  { ssr: false },
);

const BulkDeleteConfirmDialog = dynamic(
  () =>
    import("@/components/common/bulk-delete-confirm-dialog").then(
      (mod) => mod.BulkDeleteConfirmDialog,
    ),
  { ssr: false },
);

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

function InitialContentListSeeder({
  queryArgs,
  data,
  onSeeded,
}: {
  readonly queryArgs: ContentListQuery;
  readonly data: BackendContentListResponse;
  readonly onSeeded: () => void;
}): null {
  const dispatch = useAppDispatch();

  useLayoutEffect(() => {
    let cancelled = false;
    const seedResult = dispatch(
      contentApi.util.upsertQueryData("listContent", queryArgs, data),
    );
    void seedResult.then(() => {
      if (!cancelled) {
        onSeeded();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, dispatch, onSeeded, queryArgs]);

  return null;
}

interface ContentPageViewProps {
  readonly initialQueryArgs?: ContentListQuery;
  readonly initialData?: BackendContentListResponse;
}

export function ContentPageView({
  initialQueryArgs,
  initialData,
}: ContentPageViewProps = {}): ReactElement {
  const [isInitialListSeeded, setIsInitialListSeeded] = useState(
    () => initialQueryArgs == null || initialData == null,
  );
  const handleInitialListSeeded = useCallback(() => {
    setIsInitialListSeeded(true);
  }, []);
  const initialList = useMemo(
    () =>
      initialQueryArgs != null && initialData != null
        ? {
            queryArgs: initialQueryArgs,
            data: initialData,
            isSeeded: isInitialListSeeded,
          }
        : undefined,
    [initialData, initialQueryArgs, isInitialListSeeded],
  );
  const controller = useContentPageController({ initialList });
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

    if (result.successfulItems.length > 0) {
      removeSelectedIds(result.successfulItems.map((item) => item.id));
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

    if (result.failedItems.length === 0) {
      setIsSelectionMode(false);
      clearSelection();
    }
  }, [controller, removeSelectedIds, selectedItems, clearSelection]);

  const handleCancelSelectionMode = useCallback(() => {
    clearSelection();
    setIsSelectionMode(false);
  }, [clearSelection]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      {initialQueryArgs != null && initialData != null ? (
        <InitialContentListSeeder
          queryArgs={initialQueryArgs}
          data={initialData}
          onSeeded={handleInitialListSeeded}
        />
      ) : null}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ContentToolbar
            statusFilter={controller.filters.statusFilter}
            typeFilter={controller.filters.typeFilter}
            search={controller.filters.search}
            filteredResultsCount={controller.data?.total ?? 0}
            isFetching={controller.isFetching && !controller.isLoading}
            canCreateContent={controller.canCreateContent}
            canDeleteContent={controller.canDeleteContent}
            bulkState={
              isSelectionMode
                ? {
                    mode: "bulk-delete",
                    selectedCount: selectedContentCount,
                    onDelete: () => setIsBulkDeleteDialogOpen(true),
                    onCancel: handleCancelSelectionMode,
                  }
                : {
                    mode: "normal",
                    onEnterBulkDelete: () => setIsSelectionMode(true),
                  }
            }
            onSearchChange={controller.filters.handleSearchChange}
            onStatusFilterChange={controller.filters.handleStatusFilterChange}
            onTypeFilterChange={controller.filters.handleTypeFilterChange}
            onClearFilters={controller.filters.handleClearFilters}
            onCreateText={() => controller.openCreateDialog("text")}
            onCreateUpload={() => controller.openCreateDialog("upload")}
            onCreateFlash={() => controller.openCreateDialog("flash")}
          />

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {controller.isError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {controller.errorMessage}
              </div>
            ) : controller.isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-[244px] rounded-lg" />
                ))}
              </div>
            ) : controller.visibleContents.length === 0 ? (
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
            variant="compact"
            alwaysShow
          />
        </footer>
      </section>

      {controller.isCreateDialogOpen ? (
        <CreateContentDialog
          open={controller.isCreateDialogOpen}
          onOpenChange={controller.setIsCreateDialogOpen}
          mode={controller.createMode ?? "upload"}
          onUploadFile={controller.handleUploadFile}
          onCreateFlash={controller.handleCreateFlash}
          onCreateText={controller.handleCreateText}
        />
      ) : null}

      {controller.contentToEdit !== null ? (
        <EditContentDialog
          content={controller.contentToEdit}
          open={controller.contentToEdit !== null}
          onOpenChange={controller.closeEditDialog}
          onSave={controller.handleSaveContent}
        />
      ) : null}

      {controller.isDeleteDialogOpen ? (
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
      ) : null}

      {isBulkDeleteDialogOpen ? (
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
      ) : null}
    </div>
  );
}
