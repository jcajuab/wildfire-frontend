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
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
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
import {
  PAGE_SIZE,
  useDisplaysPage,
  type InitialDisplaysBootstrap,
} from "./_hooks/use-displays-page";

const DisplayRegistrationLinkDialog = dynamic(
  () =>
    import("@/components/displays/display-registration-link-dialog").then(
      (mod) => mod.DisplayRegistrationLinkDialog,
    ),
  { ssr: false },
);

const EditDisplayDialog = dynamic(
  () =>
    import("@/components/displays/edit-display-dialog").then(
      (mod) => mod.EditDisplayDialog,
    ),
  { ssr: false },
);

const DisplayGroupManagerDialog = dynamic(
  () =>
    import("@/components/displays/display-group-manager-dialog").then(
      (mod) => mod.DisplayGroupManagerDialog,
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

interface DisplaysPageViewProps {
  readonly initialQueryArgs?: DisplaysListQuery;
  readonly initialData?: DisplaysBootstrapResponse;
}

function InitialDisplaysBootstrapSeeder({
  queryArgs,
  data,
  onSeeded,
}: {
  readonly queryArgs: DisplaysListQuery;
  readonly data: DisplaysBootstrapResponse;
  readonly onSeeded: () => void;
}): null {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  useLayoutEffect(() => {
    let cancelled = false;
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

    const seedResult = dispatch(
      displaysApi.util.upsertQueryData(
        "getDisplaysBootstrap",
        queryArgs,
        merged,
      ),
    );
    void seedResult.then(() => {
      if (!cancelled) {
        onSeeded();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [data, dispatch, onSeeded, queryArgs, store]);

  return null;
}

export function DisplaysPageView({
  initialQueryArgs,
  initialData,
}: DisplaysPageViewProps = {}): ReactElement {
  const [isInitialBootstrapSeeded, setIsInitialBootstrapSeeded] = useState(
    () => initialQueryArgs == null || initialData == null,
  );
  const handleInitialBootstrapSeeded = useCallback(() => {
    setIsInitialBootstrapSeeded(true);
  }, []);
  const initialBootstrap = useMemo<InitialDisplaysBootstrap | undefined>(
    () =>
      initialQueryArgs != null && initialData != null
        ? {
            queryArgs: initialQueryArgs,
            data: initialData,
            isSeeded: isInitialBootstrapSeeded,
          }
        : undefined,
    [initialData, initialQueryArgs, isInitialBootstrapSeeded],
  );
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
    isEditDialogOpen,
    isGroupManagerOpen,
    isUnregisterDialogOpen,
    selectedDisplay,
    displayToUnregister,
    canCreateDisplay,
    canManageDisplayGroups,
    setIsAddInfoDialogOpen,
    setIsGroupManagerOpen,
    setPage,
    refetch,
    handleStatusFilterChange,
    handleSearchChange,
    handleGroupFilterChange,
    handleOutputFilterChange,
    handleClearFilters,
    handleViewPage,
    handleUnregisterDisplay,
    handleUnregisterDialogOpenChange,
    handleConfirmUnregisterDisplay,
    handleEditDisplay,
    handleSaveDisplay,
    handleEditDialogOpenChange,
    unregisterDisplayById,
  } = useDisplaysPage({ initialBootstrap });
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
      {initialQueryArgs != null && initialData != null ? (
        <InitialDisplaysBootstrapSeeder
          queryArgs={initialQueryArgs}
          data={initialData}
          onSeeded={handleInitialBootstrapSeeded}
        />
      ) : null}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DisplaysToolbar
            statusFilter={statusFilter}
            search={search}
            selectedGroups={groupFilters}
            selectedOutput={normalizedOutputFilter}
            filteredResultsCount={displaysData?.total ?? 0}
            availableGroups={availableGroupFilters}
            availableOutputs={availableOutputFilters}
            isFetching={isFetching && !isLoading}
            canCreateDisplay={canCreateDisplay}
            canManageGroups={canManageDisplayGroups}
            canDeleteDisplay={canDeleteDisplay}
            bulkState={
              isSelectionMode
                ? {
                    mode: "bulk-unregister",
                    selectedCount: selectedDisplayCount,
                    onDelete: () => setIsBulkUnregisterDialogOpen(true),
                    onCancel: handleCancelSelectionMode,
                  }
                : {
                    mode: "normal",
                    onEnterBulkUnregister: () => setIsSelectionMode(true),
                  }
            }
            onRegisterDisplay={() => setIsAddInfoDialogOpen(true)}
            onManageGroups={() => setIsGroupManagerOpen(true)}
            onStatusFilterChange={handleStatusFilterChange}
            onSearchChange={handleSearchChange}
            onGroupFilterChange={handleGroupFilterChange}
            onOutputFilterChange={handleOutputFilterChange}
            onClearFilters={handleClearFilters}
          />

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {loadErrorMessage}
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
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
                showOutputMetadata={canCreateDisplay}
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
            alwaysShow
          />
        </footer>
      </section>

      {isAddInfoDialogOpen ? (
        <DisplayRegistrationLinkDialog
          open={isAddInfoDialogOpen}
          onOpenChange={setIsAddInfoDialogOpen}
          onRegistrationSucceeded={refetch}
        />
      ) : null}

      {isEditDialogOpen || selectedDisplay != null ? (
        <EditDisplayDialog
          display={selectedDisplay}
          existingGroups={displayGroupsData}
          emergencyContentOptions={emergencyContentOptions}
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          onSave={handleSaveDisplay}
          canManageGroups={canUpdateDisplay}
        />
      ) : null}

      {isGroupManagerOpen ? (
        <DisplayGroupManagerDialog
          open={isGroupManagerOpen}
          onOpenChange={setIsGroupManagerOpen}
          groups={displayGroupsData}
        />
      ) : null}

      {isUnregisterDialogOpen || displayToUnregister != null ? (
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
      ) : null}

      {isBulkUnregisterDialogOpen ? (
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
      ) : null}
    </div>
  );
}
