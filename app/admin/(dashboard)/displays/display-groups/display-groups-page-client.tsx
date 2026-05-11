"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import { IconFilter, IconMinus, IconPlus } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  displaysApi,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { useAppDispatch } from "@/lib/hooks";
import { cn } from "@/lib/utils";

import { DisplayGroupCard } from "./_components/display-group-card";
import { CreateDisplayGroupDialog } from "./_components/create-display-group-dialog";
import { RenameDisplayGroupDialog } from "./_components/rename-display-group-dialog";
import {
  DISPLAY_PAGE_SIZE,
  useDisplayGroupsPage,
} from "./_hooks/use-display-groups-page";
import { useInfiniteScrollSentinel } from "./_hooks/use-infinite-scroll-sentinel";

function DisplayGroupsBootstrapSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: DisplaysListQuery;
  readonly data: DisplaysBootstrapResponse;
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(
      displaysApi.util.upsertQueryData("getDisplaysBootstrap", queryArgs, data),
    );
  }, [dispatch, queryArgs, data]);
  return null;
}

interface DisplayGroupsPageClientProps {
  readonly initialQueryArgs?: DisplaysListQuery;
  readonly initialData?: DisplaysBootstrapResponse;
}

export function DisplayGroupsPageClient({
  initialQueryArgs,
  initialData,
}: DisplayGroupsPageClientProps = {}): ReactElement {
  const {
    canManageGroups,
    leftGroups,
    isLoading,
    isError,
    hasMoreLeftGroups,
    isFetchingMoreLeftGroups,
    fetchMoreLeftGroups,
    selectedGroupId,
    selectedGroup,
    groupSearch,
    setGroupSearch,
    displaySearch,
    handleDisplaySearchChange,
    actionMode,
    addFilter,
    setAddFilter,
    selectedDisplayIds,
    paginatedDisplays,
    displayPage,
    displayTotal,
    setDisplayPage,
    isDisplaysLoading,
    renameGroupId,
    renameGroupInitialName,
    setRenameGroupId,
    isCreateOpen,
    setIsCreateOpen,
    isExecuting,
    isCreatePending,
    isRenamePending,
    handleSelectGroup,
    handleEnterAdd,
    handleEnterRemove,
    handleCancelAction,
    handleToggleDisplay,
    handleConfirmAdd,
    handleConfirmRemove,
    handleCreateGroup,
    handleRenameGroup,
  } = useDisplayGroupsPage({ initialData });

  const leftGroupsLoadMoreRef = useInfiniteScrollSentinel({
    hasMore: hasMoreLeftGroups,
    isFetching: isFetchingMoreLeftGroups,
    onIntersect: fetchMoreLeftGroups,
  });

  const categoryFilterTrigger =
    actionMode === "add" ? (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label="Filter by category"
          >
            <IconFilter className="size-4" aria-hidden="true" />
            {addFilter !== "ungrouped" ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-3"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="display-group-category-filter"
              className="text-xs font-medium text-foreground"
            >
              Category
            </Label>
            <Select
              value={addFilter}
              onValueChange={(v) => setAddFilter(v as typeof addFilter)}
            >
              <SelectTrigger
                id="display-group-category-filter"
                className="h-8 w-full text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ungrouped">Ungrouped</SelectItem>
                <SelectItem value="all">All non-members</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      {initialQueryArgs != null && initialData != null ? (
        <DisplayGroupsBootstrapSeeder
          queryArgs={initialQueryArgs}
          data={initialData}
        />
      ) : null}

      <PageHeader title="Display Groups">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canManageGroups ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <IconPlus
                className="size-4"
                aria-hidden="true"
                data-icon="inline-start"
              />
              Add Display Group
            </Button>
          ) : null}
        </div>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 overflow-auto p-4">
          <div className="flex min-h-0 min-w-[44rem] flex-1 flex-col overflow-hidden rounded-md border border-border md:min-w-0">
            {/* Shared pane header — single border-b guarantees horizontal line alignment */}
            <div className="flex shrink-0 border-b border-border">
              {/* Left header */}
              <div className="flex w-56 shrink-0 flex-col gap-3 border-r border-border px-3 py-2">
                <p className="text-sm font-semibold text-foreground">
                  Display Groups
                </p>
                <SearchControl
                  value={groupSearch}
                  onChange={setGroupSearch}
                  ariaLabel="Search display groups"
                  placeholder="Search display groups..."
                  className="max-w-none"
                />
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)_auto] items-end gap-3 px-3 py-2">
                <div className="flex min-w-0 flex-col gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Displays
                  </p>
                  <SearchControl
                    value={displaySearch}
                    onChange={handleDisplaySearchChange}
                    ariaLabel="Search displays"
                    placeholder={
                      selectedGroup
                        ? "Search displays..."
                        : "Select a display group first"
                    }
                    className="max-w-none"
                    disabled={!selectedGroup || isExecuting}
                    trailingAction={categoryFilterTrigger}
                  />
                </div>

                <div className="col-start-3 flex min-w-0 shrink-0 items-center justify-end gap-2">
                  {actionMode ? (
                    <>
                      <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                        {selectedDisplayIds.size} selected
                      </span>
                      <Button
                        variant="outline"
                        onClick={handleCancelAction}
                        disabled={isExecuting}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant={
                          actionMode === "remove" ? "destructive" : "default"
                        }
                        disabled={selectedDisplayIds.size === 0 || isExecuting}
                        onClick={() => {
                          if (actionMode === "add") void handleConfirmAdd();
                          else void handleConfirmRemove();
                        }}
                      >
                        {isExecuting
                          ? "Applying..."
                          : actionMode === "add"
                            ? "Add Selected"
                            : "Remove Selected"}
                      </Button>
                    </>
                  ) : canManageGroups && selectedGroup ? (
                    <>
                      <Button variant="outline" onClick={handleEnterAdd}>
                        <IconPlus
                          className="size-4"
                          aria-hidden="true"
                          data-icon="inline-start"
                        />
                        Add Displays
                      </Button>
                      <Button
                        variant="outline"
                        className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleEnterRemove}
                      >
                        <IconMinus
                          className="size-4"
                          aria-hidden="true"
                          data-icon="inline-start"
                        />
                        Remove Displays
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Two-pane scrollable area */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Left pane */}
              <div className="flex w-56 shrink-0 flex-col border-r border-border">
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 rounded-md" />
                    ))
                  ) : isError ? (
                    <p className="px-2 py-4 text-center text-xs text-destructive">
                      Failed to load groups.
                    </p>
                  ) : leftGroups.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      {groupSearch
                        ? "No matching groups."
                        : "No display groups yet."}
                    </p>
                  ) : (
                    <>
                      {leftGroups.map((group) => (
                        <DisplayGroupCard
                          key={group.id}
                          group={group}
                          isSelected={selectedGroupId === group.id}
                          onSelect={() => handleSelectGroup(group.id)}
                          onSettings={() => setRenameGroupId(group.id)}
                          canManage={canManageGroups}
                        />
                      ))}
                      {isFetchingMoreLeftGroups ? (
                        <Skeleton className="h-9 rounded-md" />
                      ) : null}
                      <div ref={leftGroupsLoadMoreRef} className="h-px" />
                    </>
                  )}
                </div>
              </div>

              {/* Right pane */}
              <div className="flex min-w-0 flex-1 flex-col">
                {!selectedGroup ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <EmptyState
                      title="Select a display group"
                      description="Choose a group on the left to view and manage its displays."
                    />
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-auto p-2">
                      {isDisplaysLoading ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                          {Array.from({ length: DISPLAY_PAGE_SIZE }).map(
                            (_, i) => (
                              <Skeleton key={i} className="h-10 rounded-md" />
                            ),
                          )}
                        </div>
                      ) : paginatedDisplays.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          {actionMode === "add" ? (
                            <EmptyState
                              title="No displays available to add"
                              description="All matching displays are already members of this group, or no displays match the current filter."
                            />
                          ) : actionMode === "remove" ? (
                            <EmptyState
                              title="No displays available to remove"
                              description="This group has no displays to remove."
                            />
                          ) : (
                            <EmptyState
                              title="No displays in this group yet"
                              description="Use Add Displays to assign displays to this group."
                            />
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                          {paginatedDisplays.map((display) => {
                            const isSelected = selectedDisplayIds.has(
                              display.id,
                            );
                            const isInteractive = actionMode !== null;
                            return (
                              <button
                                key={display.id}
                                type="button"
                                onClick={() => {
                                  if (isInteractive)
                                    handleToggleDisplay(display.id);
                                }}
                                disabled={!isInteractive || isExecuting}
                                aria-pressed={
                                  isInteractive ? isSelected : undefined
                                }
                                className={cn(
                                  "flex min-h-[2.875rem] items-center rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                                  isInteractive && !isExecuting
                                    ? "cursor-pointer"
                                    : "cursor-default",
                                  actionMode === "remove" && isSelected
                                    ? "border-destructive bg-destructive/10 text-destructive"
                                    : actionMode === "add" && isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border bg-background hover:bg-muted/50",
                                )}
                              >
                                {display.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <footer className="border-t border-border bg-background/80 empty:hidden">
                      <PaginationFooter
                        page={displayPage}
                        pageSize={DISPLAY_PAGE_SIZE}
                        total={displayTotal}
                        onPageChange={setDisplayPage}
                        alwaysShow
                      />
                    </footer>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rename dialog — keyed by groupId so it remounts with fresh state */}
      {renameGroupId !== null ? (
        <RenameDisplayGroupDialog
          key={renameGroupId}
          open={true}
          initialName={renameGroupInitialName}
          isPending={isRenamePending}
          onSave={(name) => handleRenameGroup(renameGroupId, name)}
          onClose={() => setRenameGroupId(null)}
        />
      ) : null}

      <CreateDisplayGroupDialog
        open={isCreateOpen}
        existingGroups={[]}
        isPending={isCreatePending}
        onCreate={handleCreateGroup}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
