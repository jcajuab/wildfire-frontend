import {
  formatClockTime,
  formatDate,
  formatDateWithTime,
  formatRelativeTime,
} from "@/lib/formatters";
import type { Schedule } from "@/types/schedule";

function toLocalScheduleDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function formatDurationParts(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
}

export function formatScheduleCreator(schedule: Schedule): string {
  const name = schedule.createdByUser?.name?.trim();
  if (name) return name;

  const username = schedule.createdByUser?.username?.trim();
  if (username) return username.startsWith("@") ? username : `@${username}`;

  return "Unknown sender";
}

export function formatSchedulePostedAt(schedule: Schedule): string {
  return formatDateWithTime(schedule.createdAt);
}

export function formatScheduleVisibleFrom(schedule: Schedule): string {
  return `${formatDate(schedule.startDate)}, ${formatClockTime(schedule.startTime)}`;
}

export function formatScheduleVisibleUntil(schedule: Schedule): string {
  return `${formatDate(schedule.endDate)}, ${formatClockTime(schedule.endTime)}`;
}

export function formatScheduleValidityDuration(schedule: Schedule): string {
  const start = toLocalScheduleDate(schedule.startDate, schedule.startTime);
  const end = toLocalScheduleDate(schedule.endDate, schedule.endTime);
  const durationMs = end.getTime() - start.getTime();

  if (Number.isFinite(durationMs) && durationMs > 0) {
    return formatDurationParts(Math.round(durationMs / 60000));
  }

  return `${formatClockTime(schedule.startTime)} - ${formatClockTime(schedule.endTime)}`;
}

export function formatScheduleCalendarMeta(schedule: Schedule): string {
  return `by ${formatScheduleCreator(schedule)} · ${formatRelativeTime(
    schedule.createdAt,
  )}`;
}

export function formatScheduleCalendarAriaMeta(schedule: Schedule): string {
  return `by ${formatScheduleCreator(schedule)}, scheduled ${formatSchedulePostedAt(
    schedule,
  )}`;
}
