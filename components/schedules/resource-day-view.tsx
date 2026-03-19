"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { formatLongDate } from "@/lib/formatters";
import {
  MINUTES_PER_DAY,
  createResourceDateKey,
  formatMinutesAsTime,
  type ResourceCalendarLaneEvent,
} from "@/lib/schedules/resource-calendar";
import type { ResourceGridSharedProps } from "./resource-week-view";

const DAY_GRID_TEMPLATE = "16rem minmax(0, 1fr)";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAY_EVENT_TOP_PADDING_PX = 6;
const DAY_EVENT_HEIGHT_PX = 40;
const DAY_EVENT_LANE_GAP_PX = 4;
const DAY_EVENT_BOTTOM_PADDING_PX = 6;

function getLaneHeight(events: readonly ResourceCalendarLaneEvent[]): number {
  const laneCount = events.reduce(
    (maxLaneCount, event) => Math.max(maxLaneCount, event.laneCount),
    1,
  );
  const stackedHeight =
    DAY_EVENT_TOP_PADDING_PX +
    DAY_EVENT_BOTTOM_PADDING_PX +
    laneCount * DAY_EVENT_HEIGHT_PX +
    Math.max(0, laneCount - 1) * DAY_EVENT_LANE_GAP_PX;
  return Math.max(72, stackedHeight);
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function ResourceDayView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
  onGroupToggle,
}: ResourceGridSharedProps): ReactElement {
  const day = days[0];

  const [nowMinutes, setNowMinutes] = useState(() => getNowMinutes());

  useEffect(() => {
    const tick = () => setNowMinutes(getNowMinutes());
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const isToday =
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth() &&
    day.getDate() === today.getDate();

  const nowFraction = nowMinutes / MINUTES_PER_DAY;

  return (
    <div className="flex max-h-[min(70dvh,calc(100dvh-14rem))] flex-col overflow-hidden rounded-md border border-border">
      <div className="border-b border-border px-4 py-2 text-sm font-medium">
        {formatLongDate(day)}
      </div>

      <div className="overflow-auto">
        <div className="min-w-[920px] lg:min-w-[1100px]">
          <div
            className="sticky top-0 z-30 grid border-b border-border bg-muted/30 backdrop-blur-sm"
            style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
          >
            <div className="sticky left-0 z-40 border-r border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
              Display
            </div>
            <div className="grid grid-cols-24">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-r border-border px-1 py-2 text-center text-xs text-muted-foreground last:border-r-0"
                >
                  {hour % 2 === 0 ? formatHourLabel(hour) : ""}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Current-time indicator line — only shown for today */}
            {isToday && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-red-500"
                style={{
                  left: `calc(16rem + (100% - 16rem) * ${nowFraction.toFixed(6)})`,
                }}
                aria-hidden="true"
              />
            )}

            {resources.map((row) => {
              if (row.kind === "group-header") {
                return (
                  <div
                    key={`group-${row.id}`}
                    className="border-b border-border bg-muted/10"
                  >
                    <button
                      type="button"
                      onClick={() => onGroupToggle?.(row.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {row.expanded ? (
                        <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <IconChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">{row.name}</span>
                      <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {row.displayCount}
                      </span>
                    </button>
                  </div>
                );
              }

              const resourceDateKey = createResourceDateKey(row.id, day);
              const dayEvents = eventsByResourceDate.get(resourceDateKey) ?? [];
              const laneHeight = getLaneHeight(dayEvents);

              return (
                <div
                  key={row.rowKey}
                  className="grid border-b border-border"
                  style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
                >
                  <div className="sticky left-0 z-10 flex items-center border-r border-border bg-background px-4 py-3">
                    <p
                      className={`truncate text-sm font-medium ${row.inGroup ? "pl-3" : ""}`}
                    >
                      {row.name}
                    </p>
                  </div>

                  <div
                    className="relative bg-background/60"
                    style={{ minHeight: laneHeight }}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-24">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-r border-border last:border-r-0"
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
                          type="button"
                          onClick={() => onScheduleClick(schedule)}
                          className={`absolute z-10 cursor-pointer overflow-hidden rounded border-l-4 px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            schedule.kind === "FLASH"
                              ? "border-amber-500 bg-amber-500/12 hover:bg-amber-500/20"
                              : "border-primary bg-primary/12 hover:bg-primary/20"
                          }`}
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                            top: `${DAY_EVENT_TOP_PADDING_PX + event.lane * (DAY_EVENT_HEIGHT_PX + DAY_EVENT_LANE_GAP_PX)}px`,
                            height: `${DAY_EVENT_HEIGHT_PX}px`,
                          }}
                          aria-label={`View schedule ${schedule.name} on ${row.name}, ${formatMinutesAsTime(event.startMinutes)} to ${formatMinutesAsTime(event.endMinutes)}`}
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
