"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useMemo } from "react";
import { IconBolt, IconList, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

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
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import {
  useGetDisplayOptionsQuery,
  useGetDisplayGroupsQuery,
} from "@/lib/api/displays-api";
import {
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useListSchedulesQuery,
  useUpdateScheduleMutation,
} from "@/lib/api/schedules-api";
import { useGetPlaylistOptionsQuery } from "@/lib/api/playlists-api";
import { useCan } from "@/hooks/use-can";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  mapBackendSchedulesToSchedules,
  mapCreateFormToScheduleRequest,
  mapUpdateFormToScheduleRequest,
} from "@/lib/mappers/schedule-mapper";
import type {
  Schedule,
  CalendarView,
  ResourceMode,
  ScheduleFormData,
} from "@/types/schedule";

const SCHEDULE_CREATE_FALLBACK_MESSAGE = "Failed to create schedule.";
const SCHEDULE_CONFLICT_MESSAGE =
  "Schedule overlaps with an existing schedule on the selected display.";

function toIsoDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getScheduleWindow(
  currentDate: Date,
  view: CalendarView,
): {
  from: string;
  to: string;
} {
  const start = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  if (view === "resource-week") {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }

  return { from: toIsoDate(start), to: toIsoDate(start) };
}

function isConflictError(err: unknown): boolean {
  if (typeof err !== "object" || err == null || !("status" in err)) {
    return false;
  }
  return (err as { status?: unknown }).status === 409;
}

export default function SchedulesPage(): ReactElement {
  const canEditSchedule = useCan("schedules:update");
  const canDeleteSchedule = useCan("schedules:delete");
  const canReadDisplays = useCan("displays:read");
  const canReadPlaylists = useCan("playlists:read");
  const canReadContent = useCan("content:read");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("resource-week");
  const [resourceMode, setResourceMode] = useState<ResourceMode>("display");
  const scheduleWindow = useMemo(
    () => getScheduleWindow(currentDate, view),
    [currentDate, view],
  );
  const { data: displaysData } = useGetDisplayOptionsQuery(undefined, {
    skip: !canReadDisplays,
  });
  const { data: displayGroupsData } = useGetDisplayGroupsQuery();
  const { data: schedulesData } = useListSchedulesQuery(scheduleWindow, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: playlistsData } = useGetPlaylistOptionsQuery(undefined, {
    skip: !canReadPlaylists,
  });
  const { data: flashContentData } = useGetContentOptionsQuery(
    { type: "FLASH", status: "READY" },
    { skip: !canReadContent },
  );
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();

  const availablePlaylists: readonly { id: string; name: string }[] = useMemo(
    () =>
      playlistsData?.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
      })) ?? [],
    [playlistsData],
  );
  const availableDisplays: readonly { id: string; name: string }[] = useMemo(
    () => displaysData?.map((d) => ({ id: d.id, name: d.name })) ?? [],
    [displaysData],
  );
  const availableFlashContents: readonly { id: string; title: string }[] =
    useMemo(
      () =>
        (flashContentData ?? []).map((content) => ({
          id: content.id,
          title: content.title,
        })),
      [flashContentData],
    );

  const schedules: Schedule[] = useMemo(
    () => mapBackendSchedulesToSchedules(schedulesData ?? []),
    [schedulesData],
  );

  const [createDialogKind, setCreateDialogKind] = useState<
    "PLAYLIST" | "FLASH" | null
  >(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "resource-week") newDate.setDate(newDate.getDate() - 7);
      if (view === "resource-day") newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "resource-week") newDate.setDate(newDate.getDate() + 7);
      if (view === "resource-day") newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, [view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleScheduleClick = useCallback((schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewDialogOpen(true);
  }, []);

  const handleEditFromView = useCallback((schedule: Schedule) => {
    setViewDialogOpen(false);
    setSelectedSchedule(schedule);
    setEditDialogOpen(true);
  }, []);

  const handleCreateSchedule = useCallback(
    async (data: ScheduleFormData) => {
      try {
        await createSchedule(mapCreateFormToScheduleRequest(data)).unwrap();
        toast.success("Schedule created.");
      } catch (err) {
        if (isConflictError(err)) {
          notifyApiError(err, SCHEDULE_CONFLICT_MESSAGE);
          throw err;
        }
        const message = getApiErrorMessage(
          err,
          SCHEDULE_CREATE_FALLBACK_MESSAGE,
        );
        notifyApiError(err, message);
        throw err;
      }
    },
    [createSchedule],
  );

  const handleDeleteSchedule = useCallback(
    async (schedule: Schedule) => {
      try {
        await deleteSchedule(schedule.id).unwrap();
        toast.success("Schedule deleted.");
      } catch (err) {
        notifyApiError(err, "Failed to delete schedule.");
      }
    },
    [deleteSchedule],
  );

  const handleSaveSchedule = useCallback(
    async (schedule: Schedule, data: ScheduleFormData) => {
      try {
        await updateSchedule(
          mapUpdateFormToScheduleRequest(schedule.id, data),
        ).unwrap();
        toast.success("Schedule updated.");
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to update schedule.");
        notifyApiError(err, message);
        throw err;
      }
    },
    [updateSchedule],
  );

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
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
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
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex flex-col pt-6">
            <CalendarGrid
              currentDate={currentDate}
              view={view}
              schedules={schedules}
              resources={availableDisplays}
              onScheduleClick={handleScheduleClick}
              resourceMode={resourceMode}
              displayGroups={displayGroupsData ?? []}
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
