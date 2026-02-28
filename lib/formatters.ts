import type { ContentStatus } from "@/types/content";

export function formatContentStatus(status: ContentStatus): string {
  return status === "IN_USE" ? "In use" : "Draft";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const decimals = value < 10 && unitIndex > 0 ? 1 : 0;
  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${formattedValue} ${units[unitIndex]}`;
}

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Converts a YYYY-MM-DD date string to ISO 8601 start-of-day in UTC.
 * Interprets the date as the user's local calendar day (e.g. "today" = midnight to end of day in user's timezone).
 */
export function dateToISOStart(date: string): string {
  const localStart = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(localStart.getTime())) {
    return `${date}T00:00:00.000Z`;
  }
  return localStart.toISOString();
}

/**
 * Converts a YYYY-MM-DD date string to ISO 8601 end-of-day in UTC.
 * Interprets the date as the user's local calendar day (e.g. "today" = midnight to end of day in user's timezone).
 */
export function dateToISOEnd(date: string): string {
  const localEnd = new Date(`${date}T23:59:59.999`);
  if (!Number.isFinite(localEnd.getTime())) {
    return `${date}T23:59:59.999Z`;
  }
  return localEnd.toISOString();
}

export function formatClockTime(time: string): string {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}
