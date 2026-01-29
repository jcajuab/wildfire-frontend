"use client";

import { useMemo, useRef, useEffect } from "react";
import type {
  Schedule,
  CalendarWeek,
  CalendarDay,
  CalendarView,
} from "@/types/schedule";

interface CalendarGridProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px per hour

function getCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const weeks: CalendarWeek[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

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

function MonthView({
  currentDate,
  schedules,
  onScheduleClick,
}: CalendarGridProps): React.ReactElement {
  const weeks = useMemo(() => {
    return getCalendarWeeks(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
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

      <div className="flex flex-1 flex-col overflow-y-auto">
        {weeks.map((week, weekIndex) => {
          const scheduleBars = getScheduleBarsForWeek(week, schedules);

          return (
            <div
              key={weekIndex}
              className="relative grid min-h-32 flex-1 grid-cols-7 border-b last:border-b-0"
            >
              {week.days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`relative border-r p-1 last:border-r-0 ${
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

function TimeGrid({
  currentDate,
  days,
  schedules,
  onScheduleClick,
}: {
  currentDate: Date;
  days: Date[];
  schedules: readonly Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
}): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex border-b bg-muted/30 pr-4">
        <div className="w-16 border-r bg-background" /> {/* Time Column */}
        {days.map((day, i) => {
          const isToday =
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear();
          return (
            <div
              key={i}
              className="flex-1 border-r px-2 py-2 text-center last:border-r-0"
            >
              <div
                className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
              >
                {WEEKDAYS[day.getDay()]}
              </div>
              <div
                className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        {/* Time Labels */}
        <div className="w-16 flex-none border-r bg-background">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="relative border-b text-right text-xs text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 right-2 bg-background px-1">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-1">
          {days.map((day, dayIndex) => {
            // Find overlapping schedules
            const daySchedules = schedules.filter((s) => {
              const start = new Date(s.startDate);
              const end = new Date(s.endDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              const current = new Date(day);
              current.setHours(0, 0, 0, 0);
              
              // Only show if the schedule overlaps this day AND matches recurrence logic (simplified here)
              // For prototype, we show if within range
              return current >= start && current <= end;
            });

            return (
              <div
                key={dayIndex}
                className="relative flex-1 border-r last:border-r-0"
              >
                {/* Horizontal Lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {daySchedules.map((schedule) => {
                  const [startH, startM] = schedule.startTime
                    .split(":")
                    .map(Number);
                  const [endH, endM] = schedule.endTime.split(":").map(Number);
                  
                  const startMinutes = startH * 60 + startM;
                  const endMinutes = endH * 60 + endM;
                  const durationMinutes = endMinutes - startMinutes;

                  const top = (startMinutes / 60) * HOUR_HEIGHT;
                  const height = (durationMinutes / 60) * HOUR_HEIGHT;

                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => onScheduleClick(schedule)}
                      className="absolute inset-x-1 z-10 overflow-hidden rounded border-l-4 border-primary bg-primary/10 p-1 text-left text-xs transition-colors hover:bg-primary/20"
                      style={{
                        top,
                        height: Math.max(height, 20), // Minimum height
                      }}
                    >
                      <div className="font-medium text-primary">
                        {schedule.name}
                      </div>
                      <div className="text-primary/80">
                        {formatTime(schedule.startTime)} -{" "}
                        {formatTime(schedule.endTime)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  schedules,
  onScheduleClick,
}: CalendarGridProps): React.ReactElement {
  const days = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  return (
    <TimeGrid
      currentDate={currentDate}
      days={days}
      schedules={schedules}
      onScheduleClick={onScheduleClick}
    />
  );
}

function DayView({
  currentDate,
  schedules,
  onScheduleClick,
}: CalendarGridProps): React.ReactElement {
  return (
    <TimeGrid
      currentDate={currentDate}
      days={[currentDate]}
      schedules={schedules}
      onScheduleClick={onScheduleClick}
    />
  );
}

export function CalendarGrid(props: CalendarGridProps): React.ReactElement {
  if (props.view === "week") return <WeekView {...props} />;
  if (props.view === "day") return <DayView {...props} />;
  return <MonthView {...props} />;
}
