"use client";

import { useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import {
  useGetDisplayOptionsQuery,
  useGetDisplayGroupsQuery,
} from "@/lib/api/displays-api";
import { useListSchedulesQuery } from "@/lib/api/schedules-api";
import { useGetPlaylistOptionsQuery } from "@/lib/api/playlists-api";
import { mapBackendSchedulesToSchedules } from "@/lib/mappers/schedule-mapper";
import type { Schedule } from "@/types/schedule";
import { useScheduleFilters } from "./use-schedule-filters";
import { useScheduleDialogs } from "./use-schedule-dialogs";
import { useScheduleHandlers } from "./use-schedule-handlers";

export function useSchedulesPage() {
  const canEditSchedule = useCan("schedules:update");
  const canDeleteSchedule = useCan("schedules:delete");
  const canReadDisplays = useCan("displays:read");
  const canReadPlaylists = useCan("playlists:read");
  const canReadContent = useCan("content:read");

  const {
    currentDate,
    view,
    setView,
    resourceMode,
    setResourceMode,
    displayGroupSort,
    setDisplayGroupSort,
    scheduleWindow,
    handlePrev,
    handleNext,
    handleToday,
  } = useScheduleFilters();

  const {
    createDialogKind,
    setCreateDialogKind,
    viewDialogOpen,
    setViewDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedSchedule,
    handleScheduleClick,
    handleEditFromView,
  } = useScheduleDialogs();

  const { handleCreateSchedule, handleDeleteSchedule, handleSaveSchedule } =
    useScheduleHandlers();

  const { data: displaysData } = useGetDisplayOptionsQuery(undefined, {
    skip: !canReadDisplays,
  });
  const { data: displayGroupsData } = useGetDisplayGroupsQuery();
  const { data: schedulesData } = useListSchedulesQuery(scheduleWindow, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const { data: playlistsData } = useGetPlaylistOptionsQuery(undefined, {
    skip: !canReadPlaylists,
  });
  const { data: flashContentData } = useGetContentOptionsQuery(
    { type: "FLASH", status: "READY" },
    { skip: !canReadContent },
  );

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
