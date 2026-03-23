"use client";

import type { ReactElement } from "react";
import { IconBolt, IconList, IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { CalendarGrid } from "@/components/schedules/calendar-grid";
import { CalendarHeader } from "@/components/schedules/calendar-header";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { EditScheduleDialog } from "@/components/schedules/edit-schedule-dialog";
import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSchedulesPage } from "./use-schedules-page";

export default function SchedulesPage(): ReactElement {
  const {
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
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Schedules"
        actions={
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
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Content>
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

          <div className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 flex flex-col">
            <CalendarGrid
              currentDate={currentDate}
              view={view}
              schedules={schedules}
              resources={availableDisplays}
              onScheduleClick={handleScheduleClick}
              resourceMode={resourceMode}
              displayGroups={sortedDisplayGroups}
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>{null}</DashboardPage.Footer>
      </DashboardPage.Body>

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
    </DashboardPage.Root>
  );
}
