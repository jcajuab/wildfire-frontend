"use client";

import { useCallback, useMemo, useState } from "react";

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
import type {
  ResourceMode,
  Schedule,
  ScheduleTimeFilter,
  ScheduleTypeFilter,
} from "@/types/schedule";
import { useScheduleFilters } from "./use-schedule-filters";
import { useScheduleDialogs } from "./use-schedule-dialogs";
import { useScheduleHandlers } from "./use-schedule-handlers";

export const SCHEDULE_RESOURCE_PAGE_SIZE = 8;

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

function scheduleMatchesSearch(schedule: Schedule, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (query.length === 0) return true;

  const searchable = [
    schedule.name,
    schedule.display.name,
    schedule.playlist?.name,
    schedule.content?.title,
  ];

  return searchable.some((value) => value?.toLowerCase().includes(query));
}

function scheduleMatchesType(
  schedule: Schedule,
  filter: ScheduleTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "playlist") return schedule.kind === "PLAYLIST";
  return schedule.kind === "FLASH";
}

function getScheduleDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

function scheduleMatchesTime(
  schedule: Schedule,
  filter: ScheduleTimeFilter,
): boolean {
  if (filter === "all") return true;

  const now = new Date();
  const start = getScheduleDateTime(schedule.startDate, schedule.startTime);
  const end = getScheduleDateTime(schedule.endDate, schedule.endTime);

  if (filter === "active") return start <= now && end >= now;
  if (filter === "upcoming") return start > now;
  return end < now;
}

function scheduleMatchesTarget(
  schedule: Schedule,
  resourceMode: ResourceMode,
  targetResourceId: string | null,
  groupDisplayIdsById: ReadonlyMap<string, readonly string[]>,
): boolean {
  if (!targetResourceId) return true;
  if (resourceMode === "display")
    return schedule.display.id === targetResourceId;
  return (
    groupDisplayIdsById.get(targetResourceId)?.includes(schedule.display.id) ===
    true
  );
}

export function useSchedulesPage(options?: {
  readonly initialBootstrap?: {
    readonly queryArgs: ScheduleWindowQuery;
    readonly data: SchedulesBootstrapResponse;
  };
}) {
  const { user, isInitialized } = useAuth();
  const [search, setSearch] = useState("");
  const [resourcePage, setResourcePage] = useState(1);
  const canCreateSchedule = useCan("schedules:create");
  const canEditSchedule = useCan("schedules:update");
  const canDeleteSchedule = useCan("schedules:delete");
  const canReadDisplays = useCan("displays:read");
  const canReadPlaylists = useCan("playlists:read");
  const canReadContent = useCan("content:read");

  const {
    currentDate,
    view,
    setView: setCalendarView,
    resourceMode,
    setResourceMode: setScheduleResourceMode,
    displayGroupSort,
    setDisplayGroupSort: setScheduleDisplayGroupSort,
    scheduleTypeFilter,
    setScheduleTypeFilter: setScheduleTypeFilterState,
    timeFilter,
    setTimeFilter: setTimeFilterState,
    targetResourceId,
    setTargetResourceId: setTargetResourceIdState,
    scheduleWindow,
    handleClearFilters: clearScheduleFilters,
    handlePrev: goToPreviousPeriod,
    handleNext: goToNextPeriod,
    handleToday: goToToday,
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

  const {
    handleCreateSchedule,
    deleteScheduleById,
    handleDeleteSchedule,
    handleSaveSchedule,
  } = useScheduleHandlers();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setResourcePage(1);
  }, []);

  const handleViewChange = useCallback(
    (nextView: typeof view) => {
      setCalendarView(nextView);
      setResourcePage(1);
    },
    [setCalendarView],
  );

  const handleResourceModeChange = useCallback(
    (nextMode: typeof resourceMode) => {
      setScheduleResourceMode(nextMode);
      setResourcePage(1);
    },
    [setScheduleResourceMode],
  );

  const handleDisplayGroupSortChange = useCallback(
    (nextSort: typeof displayGroupSort) => {
      setScheduleDisplayGroupSort(nextSort);
      setResourcePage(1);
    },
    [setScheduleDisplayGroupSort],
  );

  const handleScheduleTypeFilterChange = useCallback(
    (nextType: typeof scheduleTypeFilter) => {
      setScheduleTypeFilterState(nextType);
      setResourcePage(1);
    },
    [setScheduleTypeFilterState],
  );

  const handleTimeFilterChange = useCallback(
    (nextTime: typeof timeFilter) => {
      setTimeFilterState(nextTime);
      setResourcePage(1);
    },
    [setTimeFilterState],
  );

  const handleTargetResourceChange = useCallback(
    (nextTargetId: string | null) => {
      setTargetResourceIdState(nextTargetId);
      setResourcePage(1);
    },
    [setTargetResourceIdState],
  );

  const handleClearFilters = useCallback(() => {
    clearScheduleFilters();
    setResourcePage(1);
  }, [clearScheduleFilters]);

  const handlePrev = useCallback(() => {
    goToPreviousPeriod();
    setResourcePage(1);
  }, [goToPreviousPeriod]);

  const handleNext = useCallback(() => {
    goToNextPeriod();
    setResourcePage(1);
  }, [goToNextPeriod]);

  const handleToday = useCallback(() => {
    goToToday();
    setResourcePage(1);
  }, [goToToday]);

  const isInitialBootstrapQuery =
    options?.initialBootstrap != null &&
    normalizedScheduleWindowKey(options.initialBootstrap.queryArgs) ===
      normalizedScheduleWindowKey(scheduleWindow);

  const {
    data: bootstrapData,
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isError: queryIsError,
    refetch,
  } = useGetSchedulesBootstrapQuery(scheduleWindow, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const cachedInitialBootstrap =
    schedulesApi.endpoints.getSchedulesBootstrap.useQueryState(scheduleWindow, {
      skip: !isInitialBootstrapQuery,
    });
  const effectiveBootstrapData = isInitialBootstrapQuery
    ? (cachedInitialBootstrap.data ?? options?.initialBootstrap?.data)
    : bootstrapData;
  const isLoading =
    !isInitialized ||
    (effectiveBootstrapData == null &&
      (isInitialBootstrapQuery ? false : queryIsLoading));
  const isBootstrapError = queryIsError && effectiveBootstrapData == null;
  const isFetching = queryIsFetching;
  const displaysData = useMemo(
    () =>
      isInitialized && canReadDisplays
        ? effectiveBootstrapData?.displayOptions
        : [],
    [canReadDisplays, effectiveBootstrapData?.displayOptions, isInitialized],
  );
  const displayGroupsData = useMemo(
    () =>
      isInitialized && canReadDisplays
        ? effectiveBootstrapData?.displayGroups
        : [],
    [canReadDisplays, effectiveBootstrapData?.displayGroups, isInitialized],
  );
  const schedulesData = effectiveBootstrapData?.schedules;
  const playlistsData = useMemo(
    () =>
      isInitialized && canReadPlaylists
        ? effectiveBootstrapData?.playlistOptions
        : [],
    [canReadPlaylists, effectiveBootstrapData?.playlistOptions, isInitialized],
  );
  const flashContentData = useMemo(
    () =>
      isInitialized && canReadContent
        ? effectiveBootstrapData?.flashContentOptions
        : [],
    [
      canReadContent,
      effectiveBootstrapData?.flashContentOptions,
      isInitialized,
    ],
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

  const allSchedules: Schedule[] = useMemo(
    () => mapBackendSchedulesToSchedules(schedulesData ?? []),
    [schedulesData],
  );

  const groupDisplayIdsById = useMemo(
    () =>
      new Map(
        (displayGroupsData ?? []).map((group) => [group.id, group.displayIds]),
      ),
    [displayGroupsData],
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

  const schedules: Schedule[] = useMemo(
    () =>
      allSchedules.filter(
        (schedule) =>
          scheduleMatchesType(schedule, scheduleTypeFilter) &&
          scheduleMatchesTime(schedule, timeFilter) &&
          scheduleMatchesTarget(
            schedule,
            resourceMode,
            targetResourceId,
            groupDisplayIdsById,
          ) &&
          scheduleMatchesSearch(schedule, search),
      ),
    [
      allSchedules,
      groupDisplayIdsById,
      resourceMode,
      scheduleTypeFilter,
      search,
      targetResourceId,
      timeFilter,
    ],
  );

  const searchQuery = search.trim().toLowerCase();
  const hasSearchFilter = searchQuery.length > 0;
  const hasStructuredScheduleFilter =
    scheduleTypeFilter !== "all" ||
    timeFilter !== "all" ||
    targetResourceId !== null;
  const shouldFilterResources = hasSearchFilter || hasStructuredScheduleFilter;

  const scheduleDisplayIds = useMemo(
    () => new Set(schedules.map((schedule) => schedule.display.id)),
    [schedules],
  );

  const filteredDisplayResources = useMemo(
    () =>
      availableDisplays.filter((display) => {
        if (resourceMode === "display" && targetResourceId) {
          return display.id === targetResourceId;
        }

        if (!shouldFilterResources) return true;

        if (
          hasSearchFilter &&
          display.name.toLowerCase().includes(searchQuery)
        ) {
          return true;
        }

        return scheduleDisplayIds.has(display.id);
      }),
    [
      availableDisplays,
      hasSearchFilter,
      resourceMode,
      scheduleDisplayIds,
      searchQuery,
      shouldFilterResources,
      targetResourceId,
    ],
  );

  const filteredDisplayGroups = useMemo(
    () =>
      sortedDisplayGroups.filter((group) => {
        if (resourceMode === "display-group" && targetResourceId) {
          return group.id === targetResourceId;
        }

        if (!shouldFilterResources) return true;

        if (hasSearchFilter && group.name.toLowerCase().includes(searchQuery)) {
          return true;
        }

        return group.displayIds.some((displayId) =>
          scheduleDisplayIds.has(displayId),
        );
      }),
    [
      hasSearchFilter,
      resourceMode,
      scheduleDisplayIds,
      searchQuery,
      shouldFilterResources,
      sortedDisplayGroups,
      targetResourceId,
    ],
  );

  const resourceTotal =
    resourceMode === "display"
      ? filteredDisplayResources.length
      : filteredDisplayGroups.length;
  const resourceTotalPages = Math.max(
    1,
    Math.ceil(resourceTotal / SCHEDULE_RESOURCE_PAGE_SIZE),
  );
  const boundedResourcePage = Math.min(resourcePage, resourceTotalPages);
  const resourcePageStart =
    (boundedResourcePage - 1) * SCHEDULE_RESOURCE_PAGE_SIZE;

  const paginatedDisplayResources = useMemo(
    () =>
      filteredDisplayResources.slice(
        resourcePageStart,
        resourcePageStart + SCHEDULE_RESOURCE_PAGE_SIZE,
      ),
    [filteredDisplayResources, resourcePageStart],
  );

  const paginatedDisplayGroups = useMemo(
    () =>
      filteredDisplayGroups.slice(
        resourcePageStart,
        resourcePageStart + SCHEDULE_RESOURCE_PAGE_SIZE,
      ),
    [filteredDisplayGroups, resourcePageStart],
  );

  const targetResourceOptions = useMemo(
    () =>
      resourceMode === "display"
        ? availableDisplays.map((display) => ({
            id: display.id,
            name: display.name,
          }))
        : sortedDisplayGroups.map((group) => ({
            id: group.id,
            name: group.name,
          })),
    [availableDisplays, resourceMode, sortedDisplayGroups],
  );

  const canManageSelectedSchedule = canManageScheduleForUser(
    selectedSchedule,
    user,
  );

  const canDeleteScheduleItem = useCallback(
    (schedule: Schedule) =>
      canDeleteSchedule && canManageScheduleForUser(schedule, user),
    [canDeleteSchedule, user],
  );

  const hasEmptyDisplayGroups = useMemo(
    () => (displayGroupsData ?? []).some((g) => g.displayIds.length === 0),
    [displayGroupsData],
  );

  return {
    isLoading,
    isFetching,
    isBootstrapError,
    bootstrapErrorMessage:
      "Unable to load schedules. Check that playlist and schedule data is available, then try again.",
    refetch,
    canCreateSchedule,
    canEditSchedule,
    canDeleteSchedule,
    canEditSelectedSchedule: canEditSchedule && canManageSelectedSchedule,
    canDeleteSelectedSchedule: canDeleteSchedule && canManageSelectedSchedule,
    canDeleteScheduleItem,
    search,
    setSearch: handleSearchChange,
    currentDate,
    view,
    setView: handleViewChange,
    resourceMode,
    setResourceMode: handleResourceModeChange,
    displayGroupSort,
    setDisplayGroupSort: handleDisplayGroupSortChange,
    scheduleTypeFilter,
    setScheduleTypeFilter: handleScheduleTypeFilterChange,
    timeFilter,
    setTimeFilter: handleTimeFilterChange,
    targetResourceId,
    setTargetResourceId: handleTargetResourceChange,
    targetResourceOptions,
    handleClearFilters,
    resourcePage: boundedResourcePage,
    setResourcePage,
    resourcePageSize: SCHEDULE_RESOURCE_PAGE_SIZE,
    resourceTotal,
    availablePlaylists,
    availableDisplays,
    paginatedDisplayResources,
    availableDisplayGroups,
    availableFlashContents,
    schedules,
    sortedDisplayGroups,
    paginatedDisplayGroups,
    filteredDisplayResources,
    filteredDisplayGroups,
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
    deleteScheduleById,
    handleDeleteSchedule,
    handleSaveSchedule,
  };
}
