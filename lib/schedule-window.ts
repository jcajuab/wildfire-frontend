import type { CalendarView } from "@/types/schedule";

export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getScheduleWindow(
  currentDate: Date,
  view: CalendarView,
): { from: string; to: string } {
  const start = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  if (view === "resource-week") {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }

  return { from: toIsoDate(start), to: toIsoDate(start) };
}

/** Default bootstrap window used on first load (matches schedules UI defaults). */
export function defaultSchedulesBootstrapWindow(): {
  from: string;
  to: string;
} {
  return getScheduleWindow(new Date(), "resource-week");
}
