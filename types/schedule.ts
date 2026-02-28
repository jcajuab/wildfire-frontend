export type CalendarView = "resource-week" | "resource-day";

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
  readonly targetDisplay: ScheduleDisplay;
  readonly priority: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ScheduleFormData {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  playlistId: string;
  targetDisplayId: string;
  priority: number;
  isActive: boolean;
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
