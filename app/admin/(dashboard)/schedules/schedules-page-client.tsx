"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import Link from "next/link";
import { IconBolt, IconList, IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { EmptyState } from "@/components/common/empty-state";
import { CalendarGrid } from "@/components/schedules/calendar-grid";
import { CalendarHeader } from "@/components/schedules/calendar-header";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { EditScheduleDialog } from "@/components/schedules/edit-schedule-dialog";
import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  schedulesApi,
  type ScheduleWindowQuery,
  type SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
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
    canEditSelectedSchedule,
    canDeleteSelectedSchedule,
    currentDate,
    view,
    setView,
    resourceMode,
    setResourceMode,
    displayGroupSort,
    setDisplayGroupSort,
    availablePlaylists,
    availableDisplays,
    availableFlashContents,
    schedules,
    sortedDisplayGroups,
    hasEmptyDisplayGroups,
    displayGroupsData,
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
    handleDeleteSchedule,
    handleSaveSchedule,
  } = useSchedulesPage({ initialBootstrap });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Schedules">
        <Can permission="schedules:create">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <IconPlus className="size-4" />
                Create Schedule
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateDialogKind("PLAYLIST")}>
                <IconList className="size-4" />
                Playlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateDialogKind("FLASH")}>
                <IconBolt className="size-4" />
                Flash Overlay
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 p-4">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onViewChange={setView}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              resourcesCount={availableDisplays.length}
              resourceMode={resourceMode}
              onResourceModeChange={setResourceMode}
              displayGroupsCount={displayGroupsData?.length ?? 0}
              displayGroupSort={displayGroupSort}
              onDisplayGroupSortChange={setDisplayGroupSort}
            />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-auto p-4">
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
            ) : (
              <CalendarGrid
                currentDate={currentDate}
                view={view}
                schedules={schedules}
                resources={availableDisplays}
                onScheduleClick={handleScheduleClick}
                resourceMode={resourceMode}
                displayGroups={sortedDisplayGroups}
              />
            )}
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          {null}
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
        onEdit={canEditSelectedSchedule ? handleEditFromView : undefined}
        onDelete={canDeleteSelectedSchedule ? handleDeleteSchedule : undefined}
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
    </div>
  );
}
