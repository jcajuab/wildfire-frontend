"use client";

import type { ReactElement } from "react";
import type { Schedule, ScheduleDisplay } from "@/types/schedule";
import { formatWeekdayShort, formatMonthDay } from "@/lib/formatters";
import {
  createResourceDateKey,
  type ResourceCalendarLaneEvent,
} from "@/lib/schedules/resource-calendar";

const WEEK_GRID_TEMPLATE = "14rem repeat(7, minmax(0, 1fr))";

function formatDayHeader(date: Date): string {
  return formatWeekdayShort(date);
}

function formatDaySubheader(date: Date): string {
  return formatMonthDay(date);
}

export interface ResourceGridSharedProps {
  readonly days: readonly Date[];
  readonly resources: readonly ScheduleDisplay[];
  readonly eventsByResourceDate: ReadonlyMap<
    string,
    readonly ResourceCalendarLaneEvent[]
  >;
  readonly schedulesById: ReadonlyMap<string, Schedule>;
  readonly onScheduleClick: (schedule: Schedule) => void;
}

export function ResourceWeekView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
}: ResourceGridSharedProps): ReactElement {
  return (
    <div className="flex max-h-[min(70dvh,calc(100dvh-14rem))] flex-col overflow-hidden rounded-md border border-border">
      <div className="overflow-auto">
        <div className="w-full min-w-0">
          <div
            className="sticky top-0 z-30 grid border-b border-border bg-muted/30 backdrop-blur-sm"
            style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
          >
            <div className="sticky left-0 z-40 border-r border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
              Display
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-r border-border px-2 py-2 last:border-r-0"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {formatDayHeader(day)}
                </div>
                <div className="text-sm font-semibold">
                  {formatDaySubheader(day)}
                </div>
              </div>
            ))}
          </div>

          {resources.map((resource) => (
            <div
              key={resource.id}
              className="grid border-b border-border"
              style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
            >
              <div className="sticky left-0 z-20 flex items-center border-r border-border bg-background px-4 py-3">
                <p className="truncate text-sm font-medium">{resource.name}</p>
              </div>

              {days.map((day) => {
                const resourceDateKey = createResourceDateKey(resource.id, day);
                const dayEvents =
                  eventsByResourceDate.get(resourceDateKey) ?? [];

                return (
                  <div
                    key={resourceDateKey}
                    className="relative border-r border-border bg-background/60 p-1.5 last:border-r-0"
                    style={{ minHeight: 72 }}
                  >
                    {dayEvents.map((event) => {
                      const schedule = schedulesById.get(event.scheduleId);
                      if (!schedule) {
                        return null;
                      }

                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onScheduleClick(schedule)}
                          className={`mb-1 block w-full overflow-hidden rounded border-l-4 px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            schedule.kind === "FLASH"
                              ? "border-amber-500 bg-amber-500/12 hover:bg-amber-500/20"
                              : "border-primary bg-primary/12 hover:bg-primary/20"
                          }`}
                          aria-label={`View schedule ${schedule.name} on ${resource.name}, ${event.timeLabel}`}
                        >
                          <span className="block truncate text-xs font-medium">
                            {schedule.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
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
