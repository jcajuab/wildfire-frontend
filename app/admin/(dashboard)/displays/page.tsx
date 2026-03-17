"use client";

import type { ReactElement } from "react";
import { IconPlus, IconSettings } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";
import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGrid } from "@/components/displays/display-grid";
import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { ViewDisplayDialog } from "@/components/displays/view-display-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_SIZE, useDisplaysPage } from "./use-displays-page";

export default function DisplaysPage(): ReactElement {
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
  } = useDisplaysPage();

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Displays"
        actions={
          <>
            <Can permission="displays:create">
              <Button onClick={() => setIsAddInfoDialogOpen(true)}>
                <IconPlus className="size-4" aria-hidden="true" />
                Register Display
              </Button>
            </Can>
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
          </>
        }
      />

      {isError ? (
        <DashboardPage.Banner tone="danger">
          {loadErrorMessage}
        </DashboardPage.Banner>
      ) : null}

      <DashboardPage.Body>
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <DisplaysToolbar
              statusFilter={statusFilter}
              search={search}
              selectedGroups={groupFilters}
              selectedOutput={normalizedOutputFilter}
              filteredResultsCount={displaysData?.total ?? 0}
              availableGroups={availableGroupFilters}
              availableOutputs={availableOutputFilters}
              onStatusFilterChange={handleStatusFilterChange}
              onSearchChange={handleSearchChange}
              onGroupFilterChange={handleGroupFilterChange}
              onOutputFilterChange={handleOutputFilterChange}
              onClearFilters={handleClearFilters}
            />
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
              />
            )}
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={displaysData?.total ?? 0}
            onPageChange={setPage}
            variant="compact"
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <DisplayRegistrationInfoDialog
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
    </DashboardPage.Root>
  );
}
