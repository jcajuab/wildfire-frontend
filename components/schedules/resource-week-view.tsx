"use client";

import type { ReactElement } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import type { Schedule } from "@/types/schedule";
import { formatWeekdayShort, formatMonthDay } from "@/lib/formatters";
import {
  computeOverlapCounters,
  createResourceDateKey,
  type ResourceCalendarLaneEvent,
} from "@/lib/schedules/resource-calendar";
import { cn } from "@/lib/utils";

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
  readonly isSelectionMode?: boolean;
  readonly selectedIds?: ReadonlySet<string>;
  readonly canSelectSchedule?: (schedule: Schedule) => boolean;
  readonly onScheduleSelectionChange?: (
    schedule: Schedule,
    checked: boolean,
  ) => void;
}

export function ResourceWeekView({
  days,
  resources,
  eventsByResourceDate,
  schedulesById,
  onScheduleClick,
  onGroupToggle,
  isSelectionMode = false,
  selectedIds,
  canSelectSchedule,
  onScheduleSelectionChange,
}: ResourceGridSharedProps): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
      <div className="min-h-0 flex-1 overflow-auto">
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
                    <span className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-xs text-foreground">
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
                  const overlapCounters = computeOverlapCounters(
                    dayEvents,
                    schedulesById,
                  );

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

                        const counter = overlapCounters.get(event.id);
                        const showCounter =
                          counter !== undefined && counter.groupSize > 1;
                        const isSelected =
                          selectedIds?.has(schedule.id) ?? false;
                        const canSelect =
                          !isSelectionMode ||
                          (canSelectSchedule?.(schedule) ?? true);
                        const selectionLabel = isSelected
                          ? "Deselect schedule"
                          : "Select schedule";

                        return (
                          <button
                            key={event.id}
                            type="button"
                            disabled={isSelectionMode && !canSelect}
                            onClick={() => {
                              if (isSelectionMode) {
                                if (canSelect) {
                                  onScheduleSelectionChange?.(
                                    schedule,
                                    !isSelected,
                                  );
                                }
                                return;
                              }
                              onScheduleClick(schedule);
                            }}
                            className={cn(
                              "mb-1 block w-full cursor-pointer overflow-hidden rounded border-l-4 px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              schedule.kind === "FLASH"
                                ? "border-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                                : "border-primary bg-primary/10 hover:bg-primary/15",
                              isSelectionMode &&
                                "cursor-pointer opacity-75 grayscale hover:opacity-100 hover:grayscale-0",
                              isSelectionMode &&
                                !canSelect &&
                                "cursor-not-allowed opacity-40 hover:opacity-40",
                              isSelected &&
                                "border-primary bg-primary/20 opacity-100 grayscale-0 ring-2 ring-primary/25",
                            )}
                            aria-label={
                              isSelectionMode
                                ? `${selectionLabel} ${schedule.name} on ${row.name}, ${event.timeLabel}`
                                : showCounter
                                  ? `View schedule ${schedule.name} (${counter.position + 1} of ${counter.groupSize}) on ${row.name}, ${event.timeLabel}`
                                  : `View schedule ${schedule.name} on ${row.name}, ${event.timeLabel}`
                            }
                          >
                            <span className="block truncate text-xs font-medium max-[52rem]:line-clamp-2 max-[52rem]:overflow-hidden max-[52rem]:whitespace-normal">
                              {isSelectionMode ? (
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "mr-1 inline-flex size-4 items-center justify-center rounded border border-primary/35 bg-background text-primary",
                                    isSelected &&
                                      "bg-primary text-primary-foreground",
                                  )}
                                >
                                  {isSelected ? (
                                    <IconCheck className="size-3" />
                                  ) : null}
                                </span>
                              ) : null}
                              {showCounter ? (
                                <span
                                  aria-hidden
                                  className="mr-1 inline-flex size-4 items-center justify-center rounded-full border border-primary/25 bg-background text-[10px] font-semibold leading-none text-primary"
                                >
                                  {counter.position + 1}
                                </span>
                              ) : null}
                              {schedule.name}
                            </span>
                            <span className="block truncate text-xs text-foreground/80 max-[52rem]:whitespace-normal">
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
