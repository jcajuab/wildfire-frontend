import type { ContentStatus } from "@/types/content";

const APP_LOCALE = "en-US";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatWithLocale(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!Number.isFinite(date.getTime())) {
    return typeof value === "string" ? value : "";
  }
  return new Intl.DateTimeFormat(APP_LOCALE, options).format(date);
}

export function formatContentStatus(status: ContentStatus): string {
  switch (status) {
    case "PROCESSING":
      return "Processing";
    case "READY":
      return "Ready";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

/** Tailwind classes for content status badges (use with Badge variant="outline" + className). */
export function getContentStatusBadgeClassName(status: ContentStatus): string {
  switch (status) {
    case "READY":
      return "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "PROCESSING":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "FAILED":
      return "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(APP_LOCALE).format(value);
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
  const formattedValue = new Intl.NumberFormat(APP_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${formattedValue} ${units[unitIndex]}`;
}

export function formatDate(value: string | Date): string {
  return formatWithLocale(value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateWithTime(value: string | Date): string {
  return formatWithLocale(value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(value: string | Date): string {
  return formatWithLocale(value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatTimeOfDay(value: string | Date): string {
  return formatWithLocale(value, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatWeekdayShort(value: string | Date): string {
  return formatWithLocale(value, { weekday: "short" });
}

export function formatMonthDay(value: string | Date): string {
  return formatWithLocale(value, {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(value: string | Date): string {
  return formatWithLocale(value, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatItemDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `0:${remainingSeconds.toString().padStart(2, "0")}`;
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
