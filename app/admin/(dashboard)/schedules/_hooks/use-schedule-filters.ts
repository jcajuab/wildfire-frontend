"use client";

import { useState, useCallback, useMemo } from "react";
import { getScheduleWindow } from "@/lib/schedule-window";
import type {
  CalendarView,
  ResourceMode,
  DisplayGroupSortField,
  ScheduleTypeFilter,
} from "@/types/schedule";

export interface UseScheduleFiltersResult {
  currentDate: Date;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  resourceMode: ResourceMode;
  setResourceMode: (mode: ResourceMode) => void;
  displayGroupSort: DisplayGroupSortField;
  setDisplayGroupSort: (sort: DisplayGroupSortField) => void;
  scheduleTypeFilter: ScheduleTypeFilter;
  setScheduleTypeFilter: (type: ScheduleTypeFilter) => void;
  targetResourceIds: string[];
  setTargetResourceIds: (ids: string[]) => void;
  scheduleWindow: { from: string; to: string };
  handleClearFilters: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleToday: () => void;
}

export function useScheduleFilters(): UseScheduleFiltersResult {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("resource-day");
  const [resourceMode, setResourceMode] = useState<ResourceMode>("display");
  const [displayGroupSort, setDisplayGroupSort] =
    useState<DisplayGroupSortField>("alphabetical");
  const [scheduleTypeFilter, setScheduleTypeFilter] =
    useState<ScheduleTypeFilter>("all");
  const [targetResourceIds, setTargetResourceIds] = useState<string[]>([]);

  const handleResourceModeChange = useCallback((mode: ResourceMode) => {
    setResourceMode(mode);
    setTargetResourceIds([]);
  }, []);

  const scheduleWindow = useMemo(
    () => getScheduleWindow(currentDate, view),
    [currentDate, view],
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

  const handleClearFilters = useCallback(() => {
    setDisplayGroupSort("alphabetical");
    setScheduleTypeFilter("all");
    setTargetResourceIds([]);
  }, []);

  return {
    currentDate,
    view,
    setView,
    resourceMode,
    setResourceMode: handleResourceModeChange,
    displayGroupSort,
    setDisplayGroupSort,
    scheduleTypeFilter,
    setScheduleTypeFilter,
    targetResourceIds,
    setTargetResourceIds,
    scheduleWindow,
    handleClearFilters,
    handlePrev,
    handleNext,
    handleToday,
  };
}
