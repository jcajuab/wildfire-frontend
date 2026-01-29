"use client";

import { useMemo } from "react";
import type { Schedule, CalendarWeek, CalendarDay } from "@/types/schedule";

interface CalendarGridProps {
  readonly currentDate: Date;
  readonly schedules: readonly Schedule[];
  readonly onScheduleClick: (schedule: Schedule) => void;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function getCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const weeks: CalendarWeek[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday of the first week
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End on the Saturday of the last week
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  // Calculate total days
  const totalDays =
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
    const days: CalendarDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayOffset = weekIndex * 7 + dayIndex;
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + dayOffset);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        isFriday: date.getDay() === 5,
        dayOfMonth: date.getDate(),
      });
    }
    weeks.push({ days });
  }

  return weeks;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

interface ScheduleBarInfo {
  schedule: Schedule;
  startCol: number;
  endCol: number;
  label: string;
}

function getScheduleBarsForWeek(
  week: CalendarWeek,
  schedules: readonly Schedule[],
): ScheduleBarInfo[] {
  const bars: ScheduleBarInfo[] = [];

  for (const schedule of schedules) {
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    scheduleStart.setHours(0, 0, 0, 0);
    scheduleEnd.setHours(0, 0, 0, 0);

    const weekStart = week.days[0].date;
    const weekEnd = week.days[6].date;

    // Check if schedule overlaps with this week
    if (scheduleEnd >= weekStart && scheduleStart <= weekEnd) {
      const startCol = Math.max(
        0,
        Math.floor(
          (scheduleStart.getTime() - weekStart.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const endCol = Math.min(
        6,
        Math.floor(
          (scheduleEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      bars.push({
        schedule,
        startCol,
        endCol,
        label: `${schedule.name} (${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)})`,
      });
    }
  }

  return bars;
}

export function CalendarGrid({
  currentDate,
  schedules,
  onScheduleClick,
}: CalendarGridProps): React.ReactElement {
  const weeks = useMemo(() => {
    return getCalendarWeeks(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Header Row */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Weeks */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week, weekIndex) => {
          const scheduleBars = getScheduleBarsForWeek(week, schedules);

          return (
            <div
              key={weekIndex}
              className="relative grid flex-1 grid-cols-7 border-b last:border-b-0"
            >
              {week.days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`relative min-h-24 border-r p-1 last:border-r-0 ${
                    day.isFriday ? "bg-primary/5" : ""
                  } ${!day.isCurrentMonth ? "bg-muted/20" : ""}`}
                >
                  <span
                    className={`text-sm ${
                      day.isToday
                        ? "font-semibold text-primary"
                        : day.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                </div>
              ))}

              {/* Schedule Bars */}
              {scheduleBars.map((bar, barIndex) => (
                <button
                  key={bar.schedule.id}
                  type="button"
                  onClick={() => onScheduleClick(bar.schedule)}
                  className="absolute left-0 z-10 mx-1 cursor-pointer truncate rounded border-l-4 border-primary bg-primary/10 px-2 py-0.5 text-left text-xs text-primary transition-colors hover:bg-primary/20"
                  style={{
                    top: `${28 + barIndex * 24}px`,
                    left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
                    width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - 8px)`,
                  }}
                >
                  {bar.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
