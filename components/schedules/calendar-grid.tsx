"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { IconDeviceTv } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import type { CalendarView, Schedule, ScheduleDisplay } from "@/types/schedule";
import {
  MINUTES_PER_DAY,
  assignEventLanes,
  createResourceDateKey,
  formatMinutesAsTime,
  getDayDates,
  getWeekDates,
  groupEventsByResourceDate,
  projectResourceEvents,
  type ResourceCalendarLaneEvent,
} from "@/lib/schedules/resource-calendar";

interface CalendarGridProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly schedules: readonly Schedule[];
  readonly resources: readonly ScheduleDisplay[];
  readonly onScheduleClick: (schedule: Schedule) => void;
}

interface ResourceGridSharedProps {
  readonly days: readonly Date[];
  readonly resources: readonly ScheduleDisplay[];
  readonly eventsByResourceDate: ReadonlyMap<
    string,
    readonly ResourceCalendarLaneEvent[]
  >;
  readonly schedulesById: ReadonlyMap<string, Schedule>;
  readonly onScheduleClick: (schedule: Schedule) => void;
}

const WEEK_GRID_TEMPLATE = "14rem repeat(7, minmax(0, 1fr))";
const DAY_GRID_TEMPLATE = "16rem minmax(0, 1fr)";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function getLaneHeight(events: readonly ResourceCalendarLaneEvent[]): number {
  const laneCount = events.reduce(
    (maxLaneCount, event) => Math.max(maxLaneCount, event.laneCount),
    1,
  );
  return Math.max(72, 14 + laneCount * 24);
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function formatDaySubheader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function ResourceWeekView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
}: ResourceGridSharedProps): ReactElement {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border'>
      <div className='overflow-auto'>
        <div className='w-full min-w-0'>
          <div
            className='sticky top-0 z-30 grid border-b bg-muted/30 backdrop-blur-sm'
            style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
          >
            <div className='sticky left-0 z-40 border-r bg-muted/30 px-4 py-2 text-sm font-semibold'>
              Display
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className='border-r px-2 py-2 last:border-r-0'
              >
                <div className='text-xs font-medium text-muted-foreground'>
                  {formatDayHeader(day)}
                </div>
                <div className='text-sm font-semibold'>
                  {formatDaySubheader(day)}
                </div>
              </div>
            ))}
          </div>

          {resources.map((resource) => (
            <div
              key={resource.id}
              className='grid border-b'
              style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
            >
              <div className='sticky left-0 z-20 flex items-center border-r bg-background px-4 py-3'>
                <p className='truncate text-sm font-medium'>{resource.name}</p>
              </div>

              {days.map((day) => {
                const resourceDateKey = createResourceDateKey(resource.id, day);
                const dayEvents =
                  eventsByResourceDate.get(resourceDateKey) ?? [];
                const laneHeight = getLaneHeight(dayEvents);

                return (
                  <div
                    key={resourceDateKey}
                    className='relative border-r bg-background/60 p-1.5 last:border-r-0'
                    style={{ minHeight: laneHeight }}
                  >
                    {dayEvents.map((event) => {
                      const schedule = schedulesById.get(event.scheduleId);
                      if (!schedule) {
                        return null;
                      }

                      return (
                        <button
                          key={event.id}
                          type='button'
                          onClick={() => onScheduleClick(schedule)}
                          className='absolute inset-x-1 z-10 overflow-hidden rounded border-l-4 border-primary bg-primary/12 px-1.5 py-1 text-left transition-colors hover:bg-primary/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
                          style={{ top: `${6 + event.lane * 22}px` }}
                          aria-label={`View schedule ${schedule.name} on ${resource.name}, ${event.timeLabel}`}
                        >
                          <span className='block truncate text-xs font-medium text-primary'>
                            {schedule.name}
                          </span>
                          <span className='block truncate text-[11px] text-primary/80'>
                            {event.timeLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceDayView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
}: ResourceGridSharedProps): ReactElement {
  const day = days[0];

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border'>
      <div className='border-b px-4 py-2 text-sm font-medium'>
        {day.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>

      <div className='overflow-auto'>
        <div className='min-w-[1100px]'>
          <div
            className='sticky top-0 z-30 grid border-b bg-muted/30 backdrop-blur-sm'
            style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
          >
            <div className='sticky left-0 z-40 border-r bg-muted/30 px-4 py-2 text-sm font-semibold'>
              Display
            </div>
            <div className='grid grid-cols-24'>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className='border-r px-1 py-2 text-center text-[11px] text-muted-foreground last:border-r-0'
                >
                  {hour % 2 === 0 ? formatHourLabel(hour) : ""}
                </div>
              ))}
            </div>
          </div>

          {resources.map((resource) => {
            const resourceDateKey = createResourceDateKey(resource.id, day);
            const dayEvents = eventsByResourceDate.get(resourceDateKey) ?? [];
            const laneHeight = getLaneHeight(dayEvents);

            return (
              <div
                key={resource.id}
                className='grid border-b'
                style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
              >
                <div className='sticky left-0 z-20 flex items-center border-r bg-background px-4 py-3'>
                  <p className='truncate text-sm font-medium'>
                    {resource.name}
                  </p>
                </div>

                <div
                  className='relative bg-background/60'
                  style={{ minHeight: laneHeight }}
                >
                  <div className='pointer-events-none absolute inset-0 grid grid-cols-24'>
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className='border-r border-border/60 last:border-r-0'
                      />
                    ))}
                  </div>

                  {dayEvents.map((event) => {
                    const schedule = schedulesById.get(event.scheduleId);
                    if (!schedule) {
                      return null;
                    }

                    const startPercent =
                      (event.startMinutes / MINUTES_PER_DAY) * 100;
                    const widthPercent = Math.max(
                      ((event.endMinutes - event.startMinutes) /
                        MINUTES_PER_DAY) *
                        100,
                      1.2,
                    );

                    return (
                      <button
                        key={event.id}
                        type='button'
                        onClick={() => onScheduleClick(schedule)}
                        className='absolute z-10 overflow-hidden rounded border-l-4 border-primary bg-primary/12 px-1.5 py-1 text-left transition-colors hover:bg-primary/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                          top: `${6 + event.lane * 22}px`,
                        }}
                        aria-label={`View schedule ${schedule.name} on ${resource.name}, ${formatMinutesAsTime(event.startMinutes)} to ${formatMinutesAsTime(event.endMinutes)}`}
                      >
                        <span className='block truncate text-xs font-medium text-primary'>
                          {schedule.name}
                        </span>
                        <span className='block truncate text-[11px] text-primary/80'>
                          {event.timeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyResourcesState(): ReactElement {
  return (
    <EmptyState
      title='No displays available for scheduling'
      description='Add displays first, then assign schedules to resources.'
      icon={<IconDeviceTv className='size-7' aria-hidden='true' />}
    />
  );
}

export function CalendarGrid({
  currentDate,
  view,
  schedules,
  resources,
  onScheduleClick,
}: CalendarGridProps): ReactElement {
  const days = useMemo(() => {
    if (view === "resource-day") {
      return getDayDates(currentDate);
    }

    return getWeekDates(currentDate);
  }, [currentDate, view]);

  const schedulesById = useMemo(() => {
    return new Map(schedules.map((schedule) => [schedule.id, schedule]));
  }, [schedules]);

  const projectedEvents = useMemo(() => {
    return projectResourceEvents({
      schedules,
      resources,
      dates: days,
    });
  }, [schedules, resources, days]);

  const laidOutEvents = useMemo(() => {
    return assignEventLanes(projectedEvents);
  }, [projectedEvents]);

  const eventsByResourceDate = useMemo(() => {
    return groupEventsByResourceDate(laidOutEvents);
  }, [laidOutEvents]);

  if (resources.length === 0) {
    return <EmptyResourcesState />;
  }

  if (view === "resource-day") {
    return (
      <ResourceDayView
        days={days}
        resources={resources}
        eventsByResourceDate={eventsByResourceDate}
        schedulesById={schedulesById}
        onScheduleClick={onScheduleClick}
      />
    );
  }

  return (
    <ResourceWeekView
      days={days}
      resources={resources}
      eventsByResourceDate={eventsByResourceDate}
      schedulesById={schedulesById}
      onScheduleClick={onScheduleClick}
    />
  );
}
