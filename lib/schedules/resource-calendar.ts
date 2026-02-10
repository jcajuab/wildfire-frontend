import type { RecurrenceType, Schedule } from "@/types/schedule";

const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export interface CalendarResource {
  readonly id: string;
  readonly name: string;
}

export interface ResourceCalendarEvent {
  readonly id: string;
  readonly scheduleId: string;
  readonly resourceId: string;
  readonly dateKey: string;
  readonly startMinutes: number;
  readonly endMinutes: number;
  readonly timeLabel: string;
}

export interface ResourceCalendarLaneEvent extends ResourceCalendarEvent {
  readonly lane: number;
  readonly laneCount: number;
}

export function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseISODateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDates(currentDate: Date): readonly Date[] {
  const start = toDateOnly(currentDate);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function getDayDates(currentDate: Date): readonly Date[] {
  return [toDateOnly(currentDate)];
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export function formatMinutesAsTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(MINUTES_PER_DAY, minutes));
  const hours = Math.floor(normalized / MINUTES_PER_HOUR);
  const mins = normalized % MINUTES_PER_HOUR;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return `${formatMinutesAsTime(startMinutes)} - ${formatMinutesAsTime(endMinutes)}`;
}

function normalizeEndMinutes(startMinutes: number, endMinutes: number): number {
  if (endMinutes <= startMinutes) {
    return Math.min(startMinutes + MINUTES_PER_HOUR, MINUTES_PER_DAY);
  }

  return Math.min(endMinutes, MINUTES_PER_DAY);
}

function isDateWithinRange(
  date: Date,
  startDate: Date,
  endDate: Date,
): boolean {
  return date >= startDate && date <= endDate;
}

function matchesRecurrence(
  recurrence: RecurrenceType,
  scheduleStartDate: Date,
  currentDate: Date,
): boolean {
  if (recurrence === "NONE" || recurrence === "DAILY") {
    return true;
  }

  if (recurrence === "WEEKLY") {
    return currentDate.getDay() === scheduleStartDate.getDay();
  }

  if (recurrence === "MONTHLY") {
    return currentDate.getDate() === scheduleStartDate.getDate();
  }

  return false;
}

function occursOnDate(schedule: Schedule, date: Date): boolean {
  const scheduleStartDate = parseISODateOnly(schedule.startDate);
  const scheduleEndDate = parseISODateOnly(schedule.endDate);
  const currentDate = toDateOnly(date);

  if (!isDateWithinRange(currentDate, scheduleStartDate, scheduleEndDate)) {
    return false;
  }

  return matchesRecurrence(schedule.recurrence, scheduleStartDate, currentDate);
}

interface ProjectResourceEventsParams {
  readonly schedules: readonly Schedule[];
  readonly resources: readonly CalendarResource[];
  readonly dates: readonly Date[];
}

export function projectResourceEvents({
  schedules,
  resources,
  dates,
}: ProjectResourceEventsParams): readonly ResourceCalendarEvent[] {
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const normalizedDates = dates.map((date) => toDateOnly(date));

  const events: ResourceCalendarEvent[] = [];

  for (const schedule of schedules) {
    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const endMinutes = normalizeEndMinutes(
      startMinutes,
      parseTimeToMinutes(schedule.endTime),
    );
    const timeLabel = formatTimeRange(schedule.startTime, schedule.endTime);

    for (const date of normalizedDates) {
      if (!occursOnDate(schedule, date)) {
        continue;
      }

      const dateKey = toDateKey(date);
      for (const targetDisplay of schedule.targetDisplays) {
        if (!resourceIds.has(targetDisplay.id)) {
          continue;
        }

        events.push({
          id: `${schedule.id}:${targetDisplay.id}:${dateKey}`,
          scheduleId: schedule.id,
          resourceId: targetDisplay.id,
          dateKey,
          startMinutes,
          endMinutes,
          timeLabel,
        });
      }
    }
  }

  return events;
}

function getResourceDateGroupKey(resourceId: string, dateKey: string): string {
  return `${resourceId}:${dateKey}`;
}

export function createResourceDateKey(resourceId: string, date: Date): string {
  return getResourceDateGroupKey(resourceId, toDateKey(date));
}

export function assignEventLanes(
  events: readonly ResourceCalendarEvent[],
): readonly ResourceCalendarLaneEvent[] {
  const groupedEvents = new Map<string, ResourceCalendarEvent[]>();

  for (const event of events) {
    const key = getResourceDateGroupKey(event.resourceId, event.dateKey);
    const existing = groupedEvents.get(key) ?? [];
    existing.push(event);
    groupedEvents.set(key, existing);
  }

  const laidOut: ResourceCalendarLaneEvent[] = [];

  for (const group of groupedEvents.values()) {
    const sorted = [...group].sort((a, b) => {
      return (
        a.startMinutes - b.startMinutes ||
        a.endMinutes - b.endMinutes ||
        a.scheduleId.localeCompare(b.scheduleId)
      );
    });

    const laneEndMinutes: number[] = [];
    const assigned: Array<{
      readonly event: ResourceCalendarEvent;
      lane: number;
    }> = [];

    for (const event of sorted) {
      let laneIndex = laneEndMinutes.findIndex(
        (endMinute) => endMinute <= event.startMinutes,
      );

      if (laneIndex === -1) {
        laneIndex = laneEndMinutes.length;
        laneEndMinutes.push(event.endMinutes);
      } else {
        laneEndMinutes[laneIndex] = event.endMinutes;
      }

      assigned.push({
        event,
        lane: laneIndex,
      });
    }

    const laneCount = Math.max(1, laneEndMinutes.length);
    for (const { event, lane } of assigned) {
      laidOut.push({
        ...event,
        lane,
        laneCount,
      });
    }
  }

  return laidOut;
}

export function groupEventsByResourceDate(
  events: readonly ResourceCalendarLaneEvent[],
): ReadonlyMap<string, readonly ResourceCalendarLaneEvent[]> {
  const grouped = new Map<string, ResourceCalendarLaneEvent[]>();

  for (const event of events) {
    const key = getResourceDateGroupKey(event.resourceId, event.dateKey);
    const existing = grouped.get(key) ?? [];
    existing.push(event);
    grouped.set(key, existing);
  }

  for (const [key, group] of grouped.entries()) {
    grouped.set(
      key,
      [...group].sort((a, b) => {
        return a.lane - b.lane || a.startMinutes - b.startMinutes;
      }),
    );
  }

  return grouped;
}
