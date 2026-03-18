import type { ManifestScheduleWindow } from "@/lib/display-api/client";

const MIN_TIMER_FLOOR_MS = 2000;

/**
 * Parse a "HH:MM" or "HH:MM:SS" time string into total milliseconds from midnight.
 */
const parseTimeToMs = (time: string): number => {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const seconds = parts[2] ?? 0;
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
};

/**
 * Get the start of the calendar day for a given timestamp.
 */
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Compute the number of milliseconds from `now` until the next schedule boundary
 * (a startTime or endTime transition point).
 *
 * Returns `null` if there are no schedules or all schedules are expired.
 * Enforces a minimum floor of 2000ms to prevent tight loops.
 */
export const computeNextScheduleBoundaryMs = (
  schedules: readonly ManifestScheduleWindow[],
  now: Date = new Date(),
): number | null => {
  if (schedules.length === 0) {
    return null;
  }

  const nowMs = now.getTime();
  const todayStart = startOfDay(now).getTime();
  const tomorrowStart = todayStart + 86_400_000;
  const todayDateStr = now.toISOString().slice(0, 10);

  let nearest: number | null = null;

  for (const schedule of schedules) {
    // Skip schedules with past endDate
    if (schedule.endDate !== null && schedule.endDate < todayDateStr) {
      continue;
    }
    // Skip schedules with future startDate
    if (schedule.startDate !== null && schedule.startDate > todayDateStr) {
      continue;
    }

    const startMs = parseTimeToMs(schedule.startTime);
    const endMs = parseTimeToMs(schedule.endTime);
    const isOvernight = startMs >= endMs;

    // Compute today's boundary timestamps
    const todayStartBoundary = todayStart + startMs;
    let todayEndBoundary: number;

    if (isOvernight) {
      // Overnight: endTime falls on the next calendar day
      todayEndBoundary = tomorrowStart + endMs;
    } else {
      todayEndBoundary = todayStart + endMs;
    }

    // Collect future boundaries for today
    const boundaries = [todayStartBoundary, todayEndBoundary];

    for (const boundary of boundaries) {
      const delta = boundary - nowMs;
      if (delta > 0) {
        if (nearest === null || delta < nearest) {
          nearest = delta;
        }
      }
    }
  }

  // If no future boundary was found for today, compute the first boundary of tomorrow
  if (nearest === null) {
    const tomorrowDateStr = new Date(tomorrowStart).toISOString().slice(0, 10);

    for (const schedule of schedules) {
      if (schedule.endDate !== null && schedule.endDate < tomorrowDateStr) {
        continue;
      }
      if (schedule.startDate !== null && schedule.startDate > tomorrowDateStr) {
        continue;
      }

      const startMs = parseTimeToMs(schedule.startTime);
      const endMs = parseTimeToMs(schedule.endTime);
      const isOvernight = startMs >= endMs;

      const tomorrowStartBoundary = tomorrowStart + startMs;
      const tomorrowEndBoundary = isOvernight
        ? tomorrowStart + 86_400_000 + endMs
        : tomorrowStart + endMs;

      const boundaries = [tomorrowStartBoundary, tomorrowEndBoundary];

      for (const boundary of boundaries) {
        const delta = boundary - nowMs;
        if (delta > 0) {
          if (nearest === null || delta < nearest) {
            nearest = delta;
          }
        }
      }
    }
  }

  if (nearest === null) {
    return null;
  }

  return Math.max(nearest, MIN_TIMER_FLOOR_MS);
};

/**
 * Create a timer that fires at the next schedule boundary and calls `onBoundary`.
 * Returns a handle with a `clear()` method to cancel the timer.
 */
export const createScheduleBoundaryTimer = (
  schedules: readonly ManifestScheduleWindow[],
  onBoundary: () => void,
): { clear(): void } => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = (): void => {
    const delayMs = computeNextScheduleBoundaryMs(schedules);
    if (delayMs === null) {
      return;
    }
    timeoutId = setTimeout(() => {
      onBoundary();
    }, delayMs);
  };

  scheduleNext();

  return {
    clear(): void {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
};
