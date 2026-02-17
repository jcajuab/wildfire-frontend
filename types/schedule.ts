export type RecurrenceType = "DAILY" | "WEEKLY" | "MONTHLY" | "NONE";

export type CalendarView = "resource-week" | "resource-day";

export interface ScheduleCreator {
  readonly id: string;
  readonly name: string;
}

export interface SchedulePlaylist {
  readonly id: string;
  readonly name: string;
}

export interface ScheduleDisplay {
  readonly id: string;
  readonly name: string;
}

export interface Schedule {
  readonly id: string;
  readonly name: string;
  readonly startDate: string; // ISO date string
  readonly endDate: string; // ISO date string
  readonly startTime: string; // HH:mm format
  readonly endTime: string; // HH:mm format
  readonly playlist: SchedulePlaylist;
  readonly targetDisplays: readonly ScheduleDisplay[];
  readonly recurrence: RecurrenceType;
  readonly priority: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: ScheduleCreator;
}

export interface ScheduleFormData {
  name: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  playlistId: string;
  targetDisplayIds: string[];
  recurrenceEnabled: boolean;
  recurrence: RecurrenceType;
  priority: number;
}

export interface CalendarDay {
  readonly date: Date;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isFriday: boolean;
  readonly dayOfMonth: number;
}

export interface CalendarWeek {
  readonly days: readonly CalendarDay[];
}
