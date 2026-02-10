"use client";

import { useState, useCallback } from "react";
import { IconPlus } from "@tabler/icons-react";

import { CalendarGrid } from "@/components/schedules/calendar-grid";
import { CalendarHeader } from "@/components/schedules/calendar-header";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { EditScheduleDialog } from "@/components/schedules/edit-schedule-dialog";
import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type {
  Schedule,
  CalendarView,
  ScheduleFormData,
} from "@/types/schedule";

// Mock data
const mockPlaylists = [
  { id: "playlist-1", name: "Demo Playlist" },
  { id: "playlist-2", name: "Marketing Content" },
  { id: "playlist-3", name: "Welcome Messages" },
] as const;

const mockDisplays = [
  { id: "display-1", name: "446" },
  { id: "display-2", name: "Lobby Display" },
  { id: "display-3", name: "Conference Room A" },
] as const;

const mockSchedules: Schedule[] = [
  {
    id: "schedule-1",
    name: "Demo Schedule",
    startDate: "2026-01-05",
    endDate: "2026-01-09",
    startTime: "08:00",
    endTime: "17:00",
    playlist: { id: "playlist-1", name: "Demo Playlist" },
    targetDisplays: [{ id: "display-1", name: "446" }],
    recurrence: "DAILY",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:00Z",
    createdBy: { id: "user-1", name: "Admin" },
  },
];

export default function SchedulesPage(): React.ReactElement {
  // Calendar state
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 0, 1)); // Jan 2026
  const [view, setView] = useState<CalendarView>("month");

  // Schedules state
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);

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
      if (view === "month") newDate.setMonth(newDate.getMonth() - 1);
      else if (view === "week") newDate.setDate(newDate.getDate() - 7);
      else if (view === "day") newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") newDate.setMonth(newDate.getMonth() + 1);
      else if (view === "week") newDate.setDate(newDate.getDate() + 7);
      else if (view === "day") newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, [view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleMonthSelect = useCallback((month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
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

  const handleCreateSchedule = useCallback((data: ScheduleFormData) => {
    const playlist = mockPlaylists.find((p) => p.id === data.playlistId);
    const displays = data.targetDisplayIds
      .map((id) => mockDisplays.find((d) => d.id === id))
      .filter(Boolean) as { id: string; name: string }[];

    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      name: data.name,
      startDate: data.startDate.toISOString().split("T")[0],
      endDate: data.endDate.toISOString().split("T")[0],
      startTime: data.startTime,
      endTime: data.endTime,
      playlist: playlist ?? { id: "", name: "" },
      targetDisplays: displays,
      recurrence: data.recurrenceEnabled ? data.recurrence : "NONE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: "user-1", name: "Admin" },
    };

    setSchedules((prev) => [...prev, newSchedule]);
  }, []);

  const handleDeleteSchedule = useCallback((schedule: Schedule) => {
    setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
  }, []);

  const handleSaveSchedule = useCallback(
    (scheduleId: string, data: ScheduleFormData) => {
      const playlist = mockPlaylists.find((p) => p.id === data.playlistId);
      const displays = data.targetDisplayIds
        .map((id) => mockDisplays.find((d) => d.id === id))
        .filter(Boolean) as { id: string; name: string }[];

      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === scheduleId
            ? {
                ...schedule,
                name: data.name,
                startDate: data.startDate.toISOString().split("T")[0],
                endDate: data.endDate.toISOString().split("T")[0],
                startTime: data.startTime,
                endTime: data.endTime,
                playlist: playlist ?? schedule.playlist,
                targetDisplays: displays,
                recurrence: data.recurrenceEnabled ? data.recurrence : "NONE",
                updatedAt: new Date().toISOString(),
              }
            : schedule,
        ),
      );
    },
    [],
  );

  return (
    <>
      <PageHeader title="Schedules">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <IconPlus className="size-4" />
          Create Schedule
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onMonthSelect={handleMonthSelect}
        />

        <CalendarGrid
          currentDate={currentDate}
          view={view}
          schedules={schedules}
          onScheduleClick={handleScheduleClick}
        />
      </div>

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateSchedule}
        availablePlaylists={mockPlaylists}
        availableDisplays={mockDisplays}
      />

      {/* View Schedule Dialog */}
      <ViewScheduleDialog
        schedule={selectedSchedule}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={handleEditFromView}
        onDelete={handleDeleteSchedule}
      />

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        schedule={selectedSchedule}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveSchedule}
        availablePlaylists={mockPlaylists}
        availableDisplays={mockDisplays}
      />
    </>
  );
}
