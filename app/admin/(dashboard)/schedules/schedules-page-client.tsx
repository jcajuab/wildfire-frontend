"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { BulkDeleteConfirmDialog } from "@/components/common/bulk-delete-confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { CalendarGrid } from "@/components/schedules/calendar-grid";
import { CalendarHeader } from "@/components/schedules/calendar-header";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { EditScheduleDialog } from "@/components/schedules/edit-schedule-dialog";
import { SchedulesToolbar } from "@/components/schedules/schedules-toolbar";
import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import { Button } from "@/components/ui/button";
import {
  schedulesApi,
  type ScheduleWindowQuery,
  type SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { runBulkAction } from "@/lib/bulk-action";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useSchedulesPage } from "./_hooks/use-schedules-page";

export function SchedulesBootstrapCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: ScheduleWindowQuery;
  readonly data: SchedulesBootstrapResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      schedulesApi.endpoints.getSchedulesBootstrap.select(queryArgs)(state)
        .data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      schedulesApi.util.upsertQueryData(
        "getSchedulesBootstrap",
        queryArgs,
        data,
      ),
    );
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function SchedulesPageView({
  initialBootstrap,
}: {
  readonly initialBootstrap?: {
    readonly queryArgs: ScheduleWindowQuery;
    readonly data: SchedulesBootstrapResponse;
  };
} = {}): ReactElement {
  const {
    isLoading,
    isFetching,
    canCreateSchedule,
    canDeleteSchedule,
    canEditSelectedSchedule,
    canDeleteSelectedSchedule,
    canDeleteScheduleItem,
    search,
    setSearch,
    currentDate,
    view,
    setView,
    resourceMode,
    setResourceMode,
    displayGroupSort,
    setDisplayGroupSort,
    scheduleTypeFilter,
    setScheduleTypeFilter,
    targetResourceIds,
    setTargetResourceIds,
    targetResourceOptions,
    handleClearFilters,
    resourcePage,
    setResourcePage,
    resourcePageSize,
    resourceTotal,
    availablePlaylists,
    availableDisplays,
    paginatedDisplayResources,
    availableFlashContents,
    schedules,
    paginatedDisplayGroups,
    hasEmptyDisplayGroups,
    availableDisplayGroups,
    createDialogKind,
    setCreateDialogKind,
    viewDialogOpen,
    setViewDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedSchedule,
    handlePrev,
    handleNext,
    handleToday,
    isBootstrapError,
    bootstrapErrorMessage,
    refetch,
    handleScheduleClick,
    handleEditFromView,
    handleCreateSchedule,
    deleteScheduleById,
    handleDeleteSchedule,
    handleSaveSchedule,
  } = useSchedulesPage({ initialBootstrap });
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
  const hasNoDisplays =
    !isLoading && !isBootstrapError && availableDisplays.length === 0;

  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    currentDate,
    displayGroupSort,
    resourceMode,
    scheduleTypeFilter,
    search,
    targetResourceIds,
    view,
  ]);

  const selectedScheduleLabels = selectedItems.map((item) => item.label);
  const deleteSelectedLabel =
    selectedCount === 1
      ? "Delete 1 schedule"
      : `Delete ${selectedCount} schedules`;

  const handleConfirmBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const result = await runBulkAction(selectedItems, (item) =>
      deleteScheduleById(item.id),
    );

    if (result.successfulItems.length > 0) {
      removeSelectedIds(result.successfulItems.map((item) => item.id));
      toast.success(
        result.successfulItems.length === 1
          ? "Successfully deleted 1 schedule"
          : `Successfully deleted ${result.successfulItems.length} schedules`,
      );
    }

    const firstFailure = result.failedItems[0];
    if (firstFailure) {
      const message = getApiErrorMessage(
        firstFailure.error,
        "Some schedules could not be deleted.",
      );
      toast.error(
        `Failed to delete ${result.failedItems.length} of ${selectedItems.length} schedules. ${message}`,
      );
    }

    if (result.failedItems.length === 0) {
      setIsSelectionMode(false);
      clearSelection();
    }
  }, [clearSelection, deleteScheduleById, removeSelectedIds, selectedItems]);

  const handleCancelSelectionMode = useCallback(() => {
    clearSelection();
    setIsSelectionMode(false);
  }, [clearSelection]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <SchedulesToolbar
        search={search}
        resourceMode={resourceMode}
        displayGroupSort={displayGroupSort}
        scheduleTypeFilter={scheduleTypeFilter}
        targetResourceIds={targetResourceIds}
        targetResourceOptions={targetResourceOptions}
        canCreateSchedule={canCreateSchedule}
        canDeleteSchedule={canDeleteSchedule}
        bulkState={
          isSelectionMode
            ? {
                mode: "bulk-delete",
                selectedCount,
                onDelete: () => setIsBulkDeleteDialogOpen(true),
                onCancel: handleCancelSelectionMode,
              }
            : {
                mode: "normal",
                onEnterBulkDelete: () => setIsSelectionMode(true),
              }
        }
        onSearchChange={setSearch}
        onDisplayGroupSortChange={setDisplayGroupSort}
        onScheduleTypeFilterChange={setScheduleTypeFilter}
        onTargetResourceChange={setTargetResourceIds}
        onClearFilters={handleClearFilters}
        onCreatePlaylistSchedule={() => setCreateDialogKind("PLAYLIST")}
        onCreateFlashSchedule={() => setCreateDialogKind("FLASH")}
      />

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!hasNoDisplays ? (
            <div className="shrink-0 border-b border-border bg-muted/15 p-4">
              <CalendarHeader
                currentDate={currentDate}
                view={view}
                onViewChange={setView}
                resourceMode={resourceMode}
                onResourceModeChange={setResourceMode}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
              />
            </div>
          ) : null}

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            {isFetching && !isLoading ? (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-muted-foreground">
                    Fetching...
                  </span>
                </div>
              </div>
            ) : null}
            {hasEmptyDisplayGroups &&
            !isLoading &&
            resourceMode === "display-group" ? (
              <div className="mb-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Some display groups have no displays attached and are hidden.{" "}
                  <Link
                    href="/admin/displays/display-groups"
                    className="text-primary underline underline-offset-2"
                  >
                    Manage display groups
                  </Link>
                </p>
              </div>
            ) : null}
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">
                    Loading schedules...
                  </span>
                </div>
              </div>
            ) : isBootstrapError ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  title="Unable to load schedules"
                  description={bootstrapErrorMessage}
                  action={
                    <Button variant="outline" onClick={() => refetch()}>
                      Retry
                    </Button>
                  }
                />
              </div>
            ) : resourceTotal === 0 && availableDisplays.length > 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  title="No matching schedules"
                  description="Adjust the search or filters to show schedule resources."
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <CalendarGrid
                  currentDate={currentDate}
                  view={view}
                  schedules={schedules}
                  resources={
                    resourceMode === "display-group"
                      ? availableDisplays
                      : paginatedDisplayResources
                  }
                  onScheduleClick={handleScheduleClick}
                  resourceMode={resourceMode}
                  displayGroups={paginatedDisplayGroups}
                  isSelectionMode={isSelectionMode}
                  selectedIds={isSelectionMode ? selectedIds : undefined}
                  canSelectSchedule={canDeleteScheduleItem}
                  onScheduleSelectionChange={
                    canDeleteSchedule && isSelectionMode
                      ? (schedule, checked) =>
                          setItemSelected(
                            { id: schedule.id, label: schedule.name },
                            checked,
                          )
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-border bg-background/80">
          <PaginationFooter
            page={resourcePage}
            pageSize={resourcePageSize}
            total={resourceTotal}
            onPageChange={setResourcePage}
            alwaysShow
          />
        </footer>
      </section>

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={createDialogKind !== null}
        onOpenChange={(open) => {
          if (!open) setCreateDialogKind(null);
        }}
        kind={createDialogKind ?? "PLAYLIST"}
        onCreate={handleCreateSchedule}
        availablePlaylists={availablePlaylists}
        availableFlashContents={availableFlashContents}
        availableDisplays={availableDisplays}
        availableDisplayGroups={availableDisplayGroups}
      />

      {/* View Schedule Dialog */}
      <ViewScheduleDialog
        schedule={selectedSchedule}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={
          !isSelectionMode && canEditSelectedSchedule
            ? handleEditFromView
            : undefined
        }
        onDelete={
          !isSelectionMode && canDeleteSelectedSchedule
            ? handleDeleteSchedule
            : undefined
        }
      />

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        schedule={selectedSchedule}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveSchedule}
        availablePlaylists={availablePlaylists}
        availableFlashContents={availableFlashContents}
        availableDisplays={availableDisplays}
      />

      <BulkDeleteConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedLabels={selectedScheduleLabels}
        title="Delete selected schedules?"
        itemName="schedule"
        itemNamePlural="schedules"
        confirmLabel={deleteSelectedLabel}
        actionDescription="This will permanently delete"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
