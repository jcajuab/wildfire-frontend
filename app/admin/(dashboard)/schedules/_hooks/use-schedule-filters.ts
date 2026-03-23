"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  CalendarView,
  ResourceMode,
  DisplayGroupSortField,
} from "@/types/schedule";

function toIsoDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getScheduleWindow(
  currentDate: Date,
  view: CalendarView,
): { from: string; to: string } {
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

export interface UseScheduleFiltersResult {
  currentDate: Date;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  resourceMode: ResourceMode;
  setResourceMode: (mode: ResourceMode) => void;
  displayGroupSort: DisplayGroupSortField;
  setDisplayGroupSort: (sort: DisplayGroupSortField) => void;
  scheduleWindow: { from: string; to: string };
  handlePrev: () => void;
  handleNext: () => void;
  handleToday: () => void;
}

export function useScheduleFilters(): UseScheduleFiltersResult {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("resource-week");
  const [resourceMode, setResourceMode] = useState<ResourceMode>("display");
  const [displayGroupSort, setDisplayGroupSort] =
    useState<DisplayGroupSortField>("alphabetical");

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

  return {
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
  };
}
