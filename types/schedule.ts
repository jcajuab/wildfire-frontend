export type CalendarView = "resource-week" | "resource-day";
export type ResourceMode = "display" | "display-group";
export type DisplayGroupSortField = "alphabetical" | "display-count";
export type ScheduleKind = "PLAYLIST" | "FLASH";
export type ScheduleTypeFilter = "all" | "playlist" | "flash";

export interface SchedulePlaylist {
  readonly id: string;
  readonly name: string;
}

export interface ScheduleContent {
  readonly id: string;
  readonly title: string;
  readonly type: "FLASH";
  readonly flashMessage: string | null;
  readonly flashTone: "INFO" | "WARNING" | "CRITICAL" | null;
}

export interface ScheduleDisplay {
  readonly id: string;
  readonly name: string;
}

export interface ScheduleCreator {
  readonly id: string;
  readonly username: string;
  readonly name: string | null;
}

export interface Schedule {
  readonly id: string;
  readonly name: string;
  readonly kind: ScheduleKind;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly playlist: SchedulePlaylist | null;
  readonly content: ScheduleContent | null;
  readonly display: ScheduleDisplay;
  readonly createdBy: string | null;
  readonly createdByUser: ScheduleCreator | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ScheduleFormData {
  readonly name: string;
  readonly kind: ScheduleKind;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly playlistId: string | null;
  readonly contentId: string | null;
  readonly targetDisplayIds: string[];
}
