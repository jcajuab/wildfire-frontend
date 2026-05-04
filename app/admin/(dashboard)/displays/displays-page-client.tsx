"use client";

import type { ReactElement } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { BulkDeleteConfirmDialog } from "@/components/common/bulk-delete-confirm-dialog";
import { BulkSelectionToolbar } from "@/components/common/bulk-selection-toolbar";
import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { DisplayRegistrationLinkDialog } from "@/components/displays/display-registration-link-dialog";
import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  displaysApi,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { runBulkAction } from "@/lib/bulk-action";
import { useAppDispatch, useAppStore } from "@/lib/hooks";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { PAGE_SIZE, useDisplaysPage } from "./_hooks/use-displays-page";

export function DisplaysBootstrapCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: DisplaysListQuery;
  readonly data: DisplaysBootstrapResponse;
}): null {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  useLayoutEffect(() => {
    const rtSlice = displaysApi.endpoints.getRuntimeOverrides.select(undefined)(
      store.getState(),
    );
    const rtData = rtSlice?.data;
    const merged: DisplaysBootstrapResponse =
      rtData != null
        ? {
            ...data,
            runtimeOverrides: rtData,
          }
        : data;
    dispatch(
      displaysApi.util.upsertQueryData(
        "getDisplaysBootstrap",
        queryArgs,
        merged,
      ),
    );
  }, [dispatch, store, queryArgs, data]);
  return null;
}

export function DisplaysPageView(): ReactElement {
  const {
    selectedItems,
    selectedIds,
    selectedCount,
    clearSelection,
    removeSelectedIds,
    setItemSelected,
  } = useBulkSelection();
  const [isBulkUnregisterDialogOpen, setIsBulkUnregisterDialogOpen] =
    useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const {
    canUpdateDisplay,
    canDeleteDisplay,
    statusFilter,
    search,
    page,
    groupFilters,
    normalizedOutputFilter,
    availableGroupFilters,
    availableOutputFilters,
    displays,
    displaysData,
    displayGroupsData,
    emergencyContentOptions,
    globalEmergencyActive,
    isLoading,
    isFetching,
    isError,
    loadErrorMessage,
    isAddInfoDialogOpen,
    isViewDialogOpen,
    isEditDialogOpen,
    isGroupManagerOpen,
    isUnregisterDialogOpen,
    selectedDisplay,
    displayToUnregister,
    setIsAddInfoDialogOpen,
    setIsViewDialogOpen,
    setIsGroupManagerOpen,
    setPage,
    refetch,
    handleStatusFilterChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
    handleViewDetails,
    handleViewPage,
    handleUnregisterDisplay,
    handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay,
    handleEditDisplay,
    handleEditFromView,
    handleSaveDisplay,
    handleEditDialogOpenChange,
    unregisterDisplayById,
  } = useDisplaysPage();
  const groupFiltersKey = useMemo(
    () => [...groupFilters].sort().join("\u0000"),
    [groupFilters],
  );

  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    groupFiltersKey,
    normalizedOutputFilter,
    search,
    statusFilter,
  ]);

  const selectedDisplayLabels = selectedItems.map((item) => item.label);
  const selectedDisplayCount = selectedCount;
  const unregisterSelectedLabel =
    selectedDisplayCount === 1
      ? "Unregister 1 display"
      : `Unregister ${selectedDisplayCount} displays`;

  const handleConfirmBulkUnregister = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const result = await runBulkAction(selectedItems, (item) =>
      unregisterDisplayById(item.id),
    );
    removeSelectedIds(result.successfulItems.map((item) => item.id));

    if (result.successfulItems.length > 0) {
      toast.success(
        result.successfulItems.length === 1
          ? "Successfully unregistered 1 display"
          : `Successfully unregistered ${result.successfulItems.length} displays`,
      );
    }

    const firstFailure = result.failedItems[0];
    if (firstFailure) {
      const message = getApiErrorMessage(
        firstFailure.error,
        "Some displays could not be unregistered.",
      );
      toast.error(
        `Failed to unregister ${result.failedItems.length} of ${selectedItems.length} displays. ${message}`,
      );
    }
  }, [removeSelectedIds, selectedItems, unregisterDisplayById]);

  const handleCancelSelectionMode = useCallback(() => {
    clearSelection();
    setIsSelectionMode(false);
  }, [clearSelection]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Displays">
        <>
          <Can permission="displays:update">
            <Button
              variant="outline"
              onClick={() => setIsGroupManagerOpen(true)}
              className="gap-2"
            >
              <IconSettings className="size-4" aria-hidden="true" />
              Add Display Group
            </Button>
          </Can>
          <Can permission="displays:create">
            <Button onClick={() => setIsAddInfoDialogOpen(true)}>
              <IconPlus className="size-4" aria-hidden="true" />
              Register Display
            </Button>
          </Can>
        </>
      </PageHeader>

      {isError ? (
        <div className="mx-6 mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive sm:mx-8">
          {loadErrorMessage}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              {isSelectionMode ? (
                <BulkSelectionToolbar
                  selectedCount={selectedDisplayCount}
                  deleteLabel={unregisterSelectedLabel}
                  onDelete={() => setIsBulkUnregisterDialogOpen(true)}
                  onCancel={handleCancelSelectionMode}
                />
              ) : null}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                {canDeleteDisplay && !isSelectionMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                    className="w-full sm:w-auto"
                  >
                    Select mode
                  </Button>
                ) : null}
                <DisplaysToolbar
                  statusFilter={statusFilter}
                  search={search}
                  selectedGroups={groupFilters}
                  selectedOutput={normalizedOutputFilter}
                  filteredResultsCount={displaysData?.total ?? 0}
                  availableGroups={availableGroupFilters}
                  availableOutputs={availableOutputFilters}
                  isFetching={isFetching && !isLoading}
                  onStatusFilterChange={handleStatusFilterChange}
                  onSearchChange={handleSearchChange}
                  onGroupFilterChange={handleGroupFilterChange}
                  onOutputFilterChange={handleOutputFilterChange}
                  onClearFilters={handleClearFilters}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-5">
            {isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[220px] rounded-md" />
                ))}
              </div>
            ) : displays.length === 0 ? (
              <EmptyState
                title="No displays yet"
                description="Register a display to start showing content on your screens."
                action={
                  <Can permission="displays:create">
                    <Button onClick={() => setIsAddInfoDialogOpen(true)}>
                      <IconPlus className="size-4" aria-hidden="true" />
                      Add Display
                    </Button>
                  </Can>
                }
              />
            ) : (
              <DisplayGrid
                items={displays}
                onViewDetails={handleViewDetails}
                onViewPage={handleViewPage}
                onUnregisterDisplay={
                  canDeleteDisplay ? handleUnregisterDisplay : undefined
                }
                onEditDisplay={canUpdateDisplay ? handleEditDisplay : undefined}
                isGlobalEmergencyActive={globalEmergencyActive}
                selectedIds={isSelectionMode ? selectedIds : undefined}
                onSelectionChange={
                  canDeleteDisplay && isSelectionMode
                    ? (display, checked) =>
                        setItemSelected(
                          { id: display.id, label: display.name },
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
            page={page}
            pageSize={PAGE_SIZE}
            total={displaysData?.total ?? 0}
            onPageChange={setPage}
            variant="compact"
          />
        </footer>
      </section>

      <DisplayRegistrationLinkDialog
        open={isAddInfoDialogOpen}
        onOpenChange={setIsAddInfoDialogOpen}
        onRegistrationSucceeded={refetch}
      />

      <ViewDisplayDialog
        display={selectedDisplay}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        canEdit={canUpdateDisplay}
      />

      <EditDisplayDialog
        display={selectedDisplay}
        existingGroups={displayGroupsData}
        emergencyContentOptions={emergencyContentOptions}
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        onSave={handleSaveDisplay}
        canManageGroups={canUpdateDisplay}
      />

      <DisplayGroupManagerDialog
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        groups={displayGroupsData}
      />

      <ConfirmActionDialog
        open={isUnregisterDialogOpen}
        onOpenChange={handleUnregisterDialogOpenChange}
        title="Unregister display?"
        description={
          displayToUnregister
            ? `This will disconnect \"${displayToUnregister.name}\" and revoke its runtime authentication key.`
            : "This will disconnect the display and revoke its runtime authentication key."
        }
        confirmLabel="Unregister Display"
        errorFallback="Failed to unregister display."
        onConfirm={handleConfirmUnregisterDisplay}
      />

      <BulkDeleteConfirmDialog
        open={isBulkUnregisterDialogOpen}
        onOpenChange={setIsBulkUnregisterDialogOpen}
        selectedLabels={selectedDisplayLabels}
        title="Unregister selected displays?"
        itemName="display"
        itemNamePlural="displays"
        confirmLabel={unregisterSelectedLabel}
        actionDescription="This will disconnect and revoke runtime authentication for"
        onConfirm={handleConfirmBulkUnregister}
      />
    </div>
  );
}
