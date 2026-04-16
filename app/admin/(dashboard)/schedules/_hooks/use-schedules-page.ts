"use client";

import { useMemo } from "react";

import { useCan } from "@/hooks/use-can";
import { useGetSchedulesBootstrapQuery } from "@/lib/api/schedules-api";
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

  const { data: bootstrapData } = useGetSchedulesBootstrapQuery(scheduleWindow, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const displaysData = canReadDisplays ? bootstrapData?.displayOptions : [];
  const displayGroupsData = canReadDisplays ? bootstrapData?.displayGroups : [];
  const schedulesData = bootstrapData?.schedules;
  const playlistsData = canReadPlaylists ? bootstrapData?.playlistOptions : [];
  const flashContentData = canReadContent
    ? bootstrapData?.flashContentOptions
    : [];

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
