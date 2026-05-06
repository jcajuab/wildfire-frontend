"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import { useGetSchedulesBootstrapQuery } from "@/lib/api/schedules-api";
import { mapBackendSchedulesToSchedules } from "@/lib/mappers/schedule-mapper";
import type { AuthUser } from "@/types/auth";
import type { Schedule } from "@/types/schedule";
import { useScheduleFilters } from "./use-schedule-filters";
import { useScheduleDialogs } from "./use-schedule-dialogs";
import { useScheduleHandlers } from "./use-schedule-handlers";

export function canManageScheduleForUser(
  schedule: Schedule | null,
  user: AuthUser | null,
): boolean {
  if (!schedule || !user) return false;
  return user.isAdmin || schedule.createdBy === user.id;
}

export function useSchedulesPage() {
  const { user } = useAuth();
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

  const {
    data: bootstrapData,
    isLoading,
    isFetching,
  } = useGetSchedulesBootstrapQuery(scheduleWindow, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const displaysData = useMemo(
    () => (canReadDisplays ? bootstrapData?.displayOptions : []),
    [canReadDisplays, bootstrapData?.displayOptions],
  );
  const displayGroupsData = useMemo(
    () => (canReadDisplays ? bootstrapData?.displayGroups : []),
    [canReadDisplays, bootstrapData?.displayGroups],
  );
  const schedulesData = bootstrapData?.schedules;
  const playlistsData = useMemo(
    () => (canReadPlaylists ? bootstrapData?.playlistOptions : []),
    [canReadPlaylists, bootstrapData?.playlistOptions],
  );
  const flashContentData = useMemo(
    () => (canReadContent ? bootstrapData?.flashContentOptions : []),
    [canReadContent, bootstrapData?.flashContentOptions],
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
  const availableDisplayGroups = useMemo(
    () =>
      (displayGroupsData ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        displayIds: g.displayIds,
      })),
    [displayGroupsData],
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

  const canManageSelectedSchedule = canManageScheduleForUser(
    selectedSchedule,
    user,
  );

  const sortedDisplayGroups = useMemo(() => {
    const groups = [...(displayGroupsData ?? [])].filter(
      (g) => g.displayIds.length > 0,
    );
    if (displayGroupSort === "alphabetical") {
      return groups.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups.sort((a, b) => b.displayIds.length - a.displayIds.length);
  }, [displayGroupsData, displayGroupSort]);

  const hasEmptyDisplayGroups = useMemo(
    () => (displayGroupsData ?? []).some((g) => g.displayIds.length === 0),
    [displayGroupsData],
  );

  return {
    isLoading,
    isFetching,
    canEditSchedule,
    canDeleteSchedule,
    canEditSelectedSchedule: canEditSchedule && canManageSelectedSchedule,
    canDeleteSelectedSchedule: canDeleteSchedule && canManageSelectedSchedule,
    currentDate,
    view,
    setView,
    resourceMode,
    setResourceMode,
    displayGroupSort,
    setDisplayGroupSort,
    availablePlaylists,
    availableDisplays,
    availableDisplayGroups,
    availableFlashContents,
    schedules,
    sortedDisplayGroups,
    hasEmptyDisplayGroups,
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
