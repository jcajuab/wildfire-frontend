"use client";

import type { ReactElement } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { Schedule } from "@/types/schedule";
import { formatWeekdayShort, formatMonthDay } from "@/lib/formatters";
import {
  createResourceDateKey,
  type ResourceCalendarLaneEvent,
} from "@/lib/schedules/resource-calendar";

const WEEK_GRID_TEMPLATE = "minmax(6rem, 14rem) repeat(7, minmax(0, 1fr))";

function formatDayHeader(date: Date): string {
  return formatWeekdayShort(date);
}

function formatDaySubheader(date: Date): string {
  return formatMonthDay(date);
}

export type CalendarRowItem =
  | {
      readonly kind: "display";
      readonly id: string;
      readonly rowKey: string;
      readonly name: string;
      readonly inGroup?: boolean;
    }
  | {
      readonly kind: "group-header";
      readonly id: string;
      readonly name: string;
      readonly expanded: boolean;
      readonly displayCount: number;
    };

export interface ResourceGridSharedProps {
  readonly days: readonly Date[];
  readonly resources: readonly CalendarRowItem[];
  readonly eventsByResourceDate: ReadonlyMap<
    string,
    readonly ResourceCalendarLaneEvent[]
  >;
  readonly schedulesById: ReadonlyMap<string, Schedule>;
  readonly onScheduleClick: (schedule: Schedule) => void;
  readonly onGroupToggle?: (groupId: string) => void;
}

export function ResourceWeekView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
  onGroupToggle,
}: ResourceGridSharedProps): ReactElement {
  return (
    <div className="flex max-h-[min(70dvh,calc(100dvh-14rem))] flex-col overflow-hidden rounded-md border border-border">
      <div className="overflow-auto">
        <div className="w-full min-w-0 max-[52rem]:min-w-[56rem]">
          <div
            className="sticky top-0 z-30 grid border-b border-border bg-muted backdrop-blur-sm max-[52rem]:hidden"
            style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
          >
            <div className="sticky left-0 z-40 border-r border-border bg-muted px-4 py-2 text-sm font-semibold">
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

          {resources.map((row) => {
            if (row.kind === "group-header") {
              return (
                <div
                  key={`group-${row.id}`}
                  className="border-b border-border bg-muted/10"
                  style={{ gridColumn: "1 / -1" }}
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

            return (
              <div
                key={row.rowKey}
                className="grid border-b border-border"
                style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
              >
                <div className="sticky left-0 z-20 flex items-center border-r border-border bg-background px-4 py-3">
                  <p
                    className={`truncate text-sm font-medium ${row.inGroup ? "pl-3" : ""}`}
                  >
                    {row.name}
                  </p>
                </div>

                {days.map((day) => {
                  const resourceDateKey = createResourceDateKey(row.id, day);
                  const dayEvents =
                    eventsByResourceDate.get(resourceDateKey) ?? [];

                  return (
                    <div
                      key={resourceDateKey}
                      className="relative border-r border-border bg-background/60 p-1.5 last:border-r-0"
                      style={{ minHeight: 72 }}
                    >
                      {dayEvents.map((event, index) => {
                        const schedule = schedulesById.get(event.scheduleId);
                        if (!schedule) {
                          return null;
                        }

                        const showCounter = dayEvents.length > 1;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => onScheduleClick(schedule)}
                            className={`mb-1 block w-full cursor-pointer overflow-hidden rounded border-l-4 px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              schedule.kind === "FLASH"
                                ? "border-amber-500 bg-amber-500/12 hover:bg-amber-500/20"
                                : "border-primary bg-primary/12 hover:bg-primary/20"
                            }`}
                            aria-label={
                              showCounter
                                ? `View schedule ${schedule.name} (${index + 1} of ${dayEvents.length}) on ${row.name}, ${event.timeLabel}`
                                : `View schedule ${schedule.name} on ${row.name}, ${event.timeLabel}`
                            }
                          >
                            <span className="block truncate text-xs font-medium max-[52rem]:line-clamp-2 max-[52rem]:overflow-hidden max-[52rem]:whitespace-normal">
                              {showCounter ? (
                                <span
                                  aria-hidden
                                  className="mr-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground"
                                >
                                  {index + 1}
                                </span>
                              ) : null}
                              {schedule.name}
                            </span>
                            <span className="block truncate text-xs text-foreground/60 max-[52rem]:whitespace-normal">
                              {event.timeLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
