"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import {
  IconChevronDown,
  IconFilter,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  displaysApi,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { useAppDispatch } from "@/lib/hooks";
import { cn } from "@/lib/utils";

import { DisplayGroupCard } from "./_components/display-group-card";
import { DisplaySidebarCard } from "./_components/display-sidebar-card";
import { CreateDisplayGroupDialog } from "./_components/create-display-group-dialog";
import { RenameDisplayGroupDialog } from "./_components/rename-display-group-dialog";
import {
  DISPLAY_PAGE_SIZE,
  GROUP_PAGE_SIZE,
  useDisplayGroupsPage,
} from "./_hooks/use-display-groups-page";
import { useInfiniteScrollSentinel } from "./_hooks/use-infinite-scroll-sentinel";

const EditDisplayDialog = dynamic(
  () =>
    import("@/components/displays/edit-display-dialog").then(
      (mod) => mod.EditDisplayDialog,
    ),
  { ssr: false },
);

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
    axis,
    handleAxisChange,
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
    selectedDisplayId,
    selectedDisplay,
    leftDisplaySearch,
    handleLeftDisplaySearchChange,
    leftDisplays,
    isLeftDisplaysLoading,
    hasMoreLeftDisplays,
    isFetchingMoreLeftDisplays,
    fetchMoreLeftDisplays,
    selectedGroupIds,
    groupsForRightPane,
    groupsRightPanePage,
    groupsRightPaneTotal,
    setGroupsRightPanePage,
    handleSelectDisplay,
    handleToggleGroup,
    handleConfirmAddGroups,
    handleConfirmRemoveGroups,
    editingDisplay,
    isEditDisplayOpen,
    handleOpenEditDisplay,
    handleEditDisplayOpenChange,
    handleSaveDisplay,
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

  const isDisplayAxis = axis === "display";

  const leftDisplaysLoadMoreRef = useInfiniteScrollSentinel({
    hasMore: hasMoreLeftDisplays,
    isFetching: isFetchingMoreLeftDisplays,
    onIntersect: fetchMoreLeftDisplays,
  });

  const leftGroupsLoadMoreRef = useInfiniteScrollSentinel({
    hasMore: hasMoreLeftGroups,
    isFetching: isFetchingMoreLeftGroups,
    onIntersect: fetchMoreLeftGroups,
  });

  const counterText = isDisplayAxis
    ? actionMode
      ? `Total selected: ${selectedGroupIds.size}`
      : `Total groups: ${groupsRightPaneTotal}`
    : actionMode
      ? `Total selected: ${selectedDisplayIds.size}`
      : `Total displays: ${displayTotal}`;

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

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <div>
          <h1 className="text-sm font-semibold">Manage display groups</h1>
          <p className="text-xs text-muted-foreground">
            {isDisplayAxis
              ? "Pick a display to view and manage the groups it belongs to."
              : "Assign displays to groups for targeted content scheduling."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={axis}
            onValueChange={(v) => handleAxisChange(v as typeof axis)}
            className="!flex-row"
          >
            <TabsList aria-label="Browse axis">
              <TabsTrigger value="group" className="px-3">
                By group
              </TabsTrigger>
              <TabsTrigger value="display" className="px-3">
                By display
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {canManageGroups ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <IconPlus className="size-4" aria-hidden="true" />
              Add display group
            </Button>
          ) : null}
        </div>
      </div>

      {/* Subtree keyed by axis so search inputs / scroll position reset cleanly on toggle (rule §5). */}
      <div key={axis} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Shared pane header — single border-b guarantees horizontal line alignment */}
        <div className="flex shrink-0 border-b border-border">
          {/* Left header */}
          <div className="flex w-56 shrink-0 flex-col gap-3 border-r border-border px-3 py-2">
            {isDisplayAxis ? (
              <>
                <p className="text-xs font-medium text-foreground">Displays</p>
                <Input
                  placeholder="Search displays…"
                  value={leftDisplaySearch}
                  onChange={(e) =>
                    handleLeftDisplaySearchChange(e.target.value)
                  }
                  className="h-7 text-xs"
                />
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-foreground">
                  Display groups
                </p>
                <Input
                  placeholder="Search groups…"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="h-7 text-xs"
                />
              </>
            )}
          </div>

          {/* Right header: 3-column layout */}
          <div className="flex min-w-0 flex-1 py-2">
            {/* container-left (25%): label + search */}
            <div className="flex w-1/4 shrink-0 flex-col gap-3 px-2">
              {isDisplayAxis ? (
                <>
                  <p className="text-xs font-medium text-foreground">
                    Display groups
                  </p>
                  <SearchControl
                    value={displaySearch}
                    onChange={handleDisplaySearchChange}
                    ariaLabel="Search display groups"
                    placeholder={
                      selectedDisplay
                        ? "Search groups…"
                        : "Select a display first"
                    }
                    className="max-w-none"
                    disabled={!selectedDisplay || isExecuting}
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-foreground">
                    Displays
                  </p>
                  <SearchControl
                    value={displaySearch}
                    onChange={handleDisplaySearchChange}
                    ariaLabel="Search displays"
                    placeholder={
                      selectedGroup
                        ? "Search displays…"
                        : "Select a group first"
                    }
                    className="max-w-none"
                    disabled={!selectedGroup || isExecuting}
                    trailingAction={categoryFilterTrigger}
                  />
                </>
              )}
            </div>

            {/* container-middle (flex-1): counter text */}
            <div className="flex flex-1 items-center justify-center px-3">
              <p className="text-sm text-muted-foreground">{counterText}</p>
            </div>

            {/* container-right: fixed-width action area */}
            <div className="flex w-[14rem] shrink-0 items-center justify-end gap-1.5 px-3">
              {actionMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAction}
                    disabled={isExecuting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      actionMode === "remove" ? "destructive" : "default"
                    }
                    disabled={
                      isDisplayAxis
                        ? selectedGroupIds.size === 0 || isExecuting
                        : selectedDisplayIds.size === 0 || isExecuting
                    }
                    onClick={() => {
                      if (isDisplayAxis) {
                        if (actionMode === "add") void handleConfirmAddGroups();
                        else void handleConfirmRemoveGroups();
                      } else {
                        if (actionMode === "add") void handleConfirmAdd();
                        else void handleConfirmRemove();
                      }
                    }}
                  >
                    {isExecuting
                      ? "Applying…"
                      : actionMode === "add"
                        ? "Add"
                        : "Remove"}
                  </Button>
                </>
              ) : canManageGroups ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        isDisplayAxis ? !selectedDisplay : !selectedGroup
                      }
                    >
                      Actions
                      <IconChevronDown
                        className="size-4"
                        aria-hidden="true"
                        data-icon="inline-end"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleEnterAdd}>
                      <IconPlus className="size-4" aria-hidden="true" />
                      {isDisplayAxis ? "Add groups" : "Add displays"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleEnterRemove}
                    >
                      <IconMinus className="size-4" aria-hidden="true" />
                      {isDisplayAxis ? "Remove groups" : "Remove displays"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>

        {/* Two-pane scrollable area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left pane */}
          <div className="flex w-56 shrink-0 flex-col border-r border-border">
            {isDisplayAxis ? (
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {isLeftDisplaysLoading && leftDisplays.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 rounded-md" />
                  ))
                ) : leftDisplays.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {leftDisplaySearch
                      ? "No matching displays."
                      : "No displays yet."}
                  </p>
                ) : (
                  <>
                    {leftDisplays.map((display) => (
                      <DisplaySidebarCard
                        key={display.id}
                        display={display}
                        isSelected={selectedDisplayId === display.id}
                        onSelect={() => handleSelectDisplay(display.id)}
                        onSettings={() => handleOpenEditDisplay(display.id)}
                        canManage={canManageGroups}
                      />
                    ))}
                    {isFetchingMoreLeftDisplays ? (
                      <Skeleton className="h-9 rounded-md" />
                    ) : null}
                    <div ref={leftDisplaysLoadMoreRef} className="h-px" />
                  </>
                )}
              </div>
            ) : (
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
            )}
          </div>

          {/* Right pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            {isDisplayAxis ? (
              !selectedDisplay ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState
                    title="Select a display"
                    description="Choose a display on the left to view and manage its display groups."
                  />
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-auto p-2">
                    {groupsForRightPane.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        {actionMode === "add" ? (
                          <EmptyState
                            title="No groups available to add"
                            description="This display already belongs to every group."
                          />
                        ) : actionMode === "remove" ? (
                          <EmptyState
                            title="No groups available to remove"
                            description="This display is not a member of any group."
                          />
                        ) : (
                          <EmptyState
                            title="No groups for this display yet"
                            description="Use Actions → Add groups to assign this display to a group."
                          />
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                        {groupsForRightPane.map((group) => {
                          const isSelected = selectedGroupIds.has(group.id);
                          const isInteractive = actionMode !== null;
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                if (isInteractive) handleToggleGroup(group.id);
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
                              {group.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <footer className="border-t border-border bg-background/80 empty:hidden">
                    <PaginationFooter
                      page={groupsRightPanePage}
                      pageSize={GROUP_PAGE_SIZE}
                      total={groupsRightPaneTotal}
                      onPageChange={setGroupsRightPanePage}
                      variant="compact"
                      alwaysShow
                    />
                  </footer>
                </>
              )
            ) : !selectedGroup ? (
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
                      {Array.from({ length: DISPLAY_PAGE_SIZE }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-md" />
                      ))}
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
                          description="Use Actions → Add displays to assign displays to this group."
                        />
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                      {paginatedDisplays.map((display) => {
                        const isSelected = selectedDisplayIds.has(display.id);
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
                    variant="compact"
                    alwaysShow
                  />
                </footer>
              </>
            )}
          </div>
        </div>
      </div>

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

      {/* Edit display details dialog — opened from the gear icon in display-axis mode */}
      {isEditDisplayOpen || editingDisplay != null ? (
        <EditDisplayDialog
          display={editingDisplay}
          existingGroups={[]}
          open={isEditDisplayOpen}
          onOpenChange={handleEditDisplayOpenChange}
          onSave={handleSaveDisplay}
        />
      ) : null}
    </div>
  );
}
