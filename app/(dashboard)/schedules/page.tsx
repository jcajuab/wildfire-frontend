"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { CalendarGrid } from "@/components/schedules/calendar-grid";
import { CalendarHeader } from "@/components/schedules/calendar-header";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { EditScheduleDialog } from "@/components/schedules/edit-schedule-dialog";
import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useGetDevicesQuery } from "@/lib/api/devices-api";
import {
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useListSchedulesQuery,
  useUpdateScheduleMutation,
} from "@/lib/api/schedules-api";
import { useListPlaylistsQuery } from "@/lib/api/playlists-api";
import { useCan } from "@/hooks/use-can";
import {
  mapBackendScheduleToSchedule,
  mapCreateFormToScheduleRequest,
  mapUpdateFormToScheduleRequest,
} from "@/lib/mappers/schedule-mapper";
import type {
  Schedule,
  CalendarView,
  ScheduleFormData,
} from "@/types/schedule";

export default function SchedulesPage(): ReactElement {
  const canEditSchedule = useCan("schedules:update");
  const canDeleteSchedule = useCan("schedules:delete");
  const { data: devicesData } = useGetDevicesQuery();
  const { data: schedulesData } = useListSchedulesQuery();
  const { data: playlistsData } = useListPlaylistsQuery();
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();

  const availablePlaylists: readonly { id: string; name: string }[] = useMemo(
    () =>
      (playlistsData?.items ?? []).map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
      })),
    [playlistsData?.items],
  );
  const availableDisplays: readonly { id: string; name: string }[] = useMemo(
    () => devicesData?.items?.map((d) => ({ id: d.id, name: d.name })) ?? [],
    [devicesData?.items],
  );

  // Calendar state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("resource-week");

  const schedules: Schedule[] = useMemo(
    () => (schedulesData?.items ?? []).map(mapBackendScheduleToSchedule),
    [schedulesData?.items],
  );

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  );

  // Calendar navigation
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

  // Schedule actions
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
        toast.error(
          err instanceof Error ? err.message : "Failed to create schedule.",
        );
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
        toast.error(
          err instanceof Error ? err.message : "Failed to delete schedule.",
        );
      }
    },
    [deleteSchedule],
  );

  const handleSaveSchedule = useCallback(
    async (scheduleId: string, data: ScheduleFormData) => {
      try {
        await updateSchedule(
          mapUpdateFormToScheduleRequest(scheduleId, data),
        ).unwrap();
        toast.success("Schedule updated.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update schedule.",
        );
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
            <Button onClick={() => setCreateDialogOpen(true)}>
              <IconPlus className="size-4" />
              Create Schedule
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Toolbar className="px-8 py-3">
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            onViewChange={setView}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            resourcesCount={availableDisplays.length}
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="flex min-h-0 flex-1 flex-col pt-6">
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            schedules={schedules}
            resources={availableDisplays}
            onScheduleClick={handleScheduleClick}
          />
        </DashboardPage.Content>

        <DashboardPage.Footer>{null}</DashboardPage.Footer>
      </DashboardPage.Body>

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateSchedule}
        availablePlaylists={availablePlaylists}
        availableDisplays={availableDisplays}
      />

      {/* View Schedule Dialog */}
      <ViewScheduleDialog
        schedule={selectedSchedule}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={handleEditFromView}
        onDelete={handleDeleteSchedule}
        canEdit={canEditSchedule}
        canDelete={canDeleteSchedule}
      />

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        schedule={selectedSchedule}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveSchedule}
        availablePlaylists={availablePlaylists}
        availableDisplays={availableDisplays}
      />
    </DashboardPage.Root>
  );
}
