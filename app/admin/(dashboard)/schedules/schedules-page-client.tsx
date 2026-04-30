"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import { IconBolt, IconList, IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
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
import { useAppDispatch } from "@/lib/hooks";
import { useSchedulesPage } from "./_hooks/use-schedules-page";

export function SchedulesBootstrapCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: ScheduleWindowQuery;
  readonly data: SchedulesBootstrapResponse;
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(
      schedulesApi.util.upsertQueryData(
        "getSchedulesBootstrap",
        queryArgs,
        data,
      ),
    );
  }, [dispatch, queryArgs, data]);
  return null;
}

export function SchedulesPageView(): ReactElement {
  const {
    isLoading,
    isFetching,
    canEditSchedule,
    canDeleteSchedule,
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
    handleScheduleClick,
    handleEditFromView,
    handleCreateSchedule,
    handleDeleteSchedule,
    handleSaveSchedule,
  } = useSchedulesPage();

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
                <DropdownMenuItem
                  onClick={() => setCreateDialogKind("PLAYLIST")}
                >
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
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2.5 sm:px-8">
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

          <div className="relative min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 flex flex-col">
            {isFetching && !isLoading ? (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-muted-foreground">Fetching...</span>
                </div>
              </div>
            ) : null}
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Loading schedules...</span>
                </div>
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
        onEdit={canEditSchedule ? handleEditFromView : undefined}
        onDelete={canDeleteSchedule ? handleDeleteSchedule : undefined}
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
