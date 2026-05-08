"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  schedulesApi,
  useGetSchedulesBootstrapQuery,
  type ScheduleWindowQuery,
  type SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
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

function normalizedScheduleWindowKey(query: ScheduleWindowQuery): string {
  return JSON.stringify({
    from: query.from,
    to: query.to,
    displayIds: query.displayIds ?? null,
  });
}

export function useSchedulesPage(options?: {
  readonly initialBootstrap?: {
    readonly queryArgs: ScheduleWindowQuery;
    readonly data: SchedulesBootstrapResponse;
  };
}) {
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

  const isInitialBootstrapQuery =
    options?.initialBootstrap != null &&
    normalizedScheduleWindowKey(options.initialBootstrap.queryArgs) ===
      normalizedScheduleWindowKey(scheduleWindow);

  const {
    data: bootstrapData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
  } = useGetSchedulesBootstrapQuery(scheduleWindow, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: isInitialBootstrapQuery,
  });
  const cachedInitialBootstrap =
    schedulesApi.endpoints.getSchedulesBootstrap.useQueryState(scheduleWindow, {
      skip: !isInitialBootstrapQuery,
    });
  const effectiveBootstrapData =
    bootstrapData ??
    cachedInitialBootstrap.data ??
    (isInitialBootstrapQuery ? options?.initialBootstrap?.data : undefined);
  const isLoading =
    effectiveBootstrapData == null &&
    (isInitialBootstrapQuery ? false : queryIsLoading);
  const isFetching = isInitialBootstrapQuery
    ? cachedInitialBootstrap.isFetching
    : queryIsFetching;
  const displaysData = useMemo(
    () => (canReadDisplays ? effectiveBootstrapData?.displayOptions : []),
    [canReadDisplays, effectiveBootstrapData?.displayOptions],
  );
  const displayGroupsData = useMemo(
    () => (canReadDisplays ? effectiveBootstrapData?.displayGroups : []),
    [canReadDisplays, effectiveBootstrapData?.displayGroups],
  );
  const schedulesData = effectiveBootstrapData?.schedules;
  const playlistsData = useMemo(
    () => (canReadPlaylists ? effectiveBootstrapData?.playlistOptions : []),
    [canReadPlaylists, effectiveBootstrapData?.playlistOptions],
  );
  const flashContentData = useMemo(
    () => (canReadContent ? effectiveBootstrapData?.flashContentOptions : []),
    [canReadContent, effectiveBootstrapData?.flashContentOptions],
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
