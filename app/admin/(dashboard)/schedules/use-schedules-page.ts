"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useCan } from "@/hooks/use-can";
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
  DisplayGroupSortField,
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

export function useSchedulesPage() {
  const canEditSchedule = useCan("schedules:update");
  const canDeleteSchedule = useCan("schedules:delete");
  const canReadDisplays = useCan("displays:read");
  const canReadPlaylists = useCan("playlists:read");
  const canReadContent = useCan("content:read");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("resource-week");
  const [resourceMode, setResourceMode] = useState<ResourceMode>("display");
  const [displayGroupSort, setDisplayGroupSort] =
    useState<DisplayGroupSortField>("alphabetical");

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

  const sortedDisplayGroups = useMemo(() => {
    const groups = [...(displayGroupsData ?? [])];
    if (displayGroupSort === "alphabetical") {
      return groups.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups.sort((a, b) => b.displayIds.length - a.displayIds.length);
  }, [displayGroupsData, displayGroupSort]);

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
        await Promise.all(
          data.targetDisplayIds.map((displayId) =>
            createSchedule(
              mapCreateFormToScheduleRequest(data, displayId),
            ).unwrap(),
          ),
        );
        toast.success(
          data.targetDisplayIds.length > 1
            ? `${data.targetDisplayIds.length} schedules created.`
            : "Schedule created.",
        );
      } catch (err) {
        if (isConflictError(err)) {
          notifyApiError(err, SCHEDULE_CONFLICT_MESSAGE);
          throw err;
        }
        notifyApiError(
          err,
          getApiErrorMessage(err, SCHEDULE_CREATE_FALLBACK_MESSAGE),
        );
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

  return {
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
  };
}
