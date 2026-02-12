import type {
  BackendSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from "@/lib/api/schedules-api";
import type {
  RecurrenceType,
  Schedule,
  ScheduleFormData,
} from "@/types/schedule";

const DEFAULT_RANGE_START = "2026-01-01";
const DEFAULT_RANGE_END = "2026-12-31";
const DAILY_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function recurrenceFromDays(days: readonly number[]): RecurrenceType {
  if (days.length === 0) return "NONE";
  const unique = new Set(days);
  if (unique.size === 7) return "DAILY";
  return "WEEKLY";
}

function daysFromForm(data: ScheduleFormData): number[] {
  if (!data.recurrenceEnabled) {
    return [data.startDate.getDay()];
  }
  if (data.recurrence === "DAILY") {
    return [...DAILY_DAYS];
  }
  if (data.recurrence === "MONTHLY") {
    return [data.startDate.getDay()];
  }
  return [data.startDate.getDay()];
}

export function mapBackendScheduleToSchedule(item: BackendSchedule): Schedule {
  return {
    id: item.id,
    name: item.name,
    startDate: DEFAULT_RANGE_START,
    endDate: DEFAULT_RANGE_END,
    startTime: item.startTime,
    endTime: item.endTime,
    playlist: {
      id: item.playlist.id,
      name: item.playlist.name ?? "Untitled playlist",
    },
    targetDisplays: [
      {
        id: item.device.id,
        name: item.device.name ?? "Unnamed display",
      },
    ],
    recurrence: recurrenceFromDays(item.daysOfWeek),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: {
      id: "",
      name: "System",
    },
  };
}

export function mapCreateFormToScheduleRequest(
  data: ScheduleFormData,
): CreateScheduleRequest {
  return {
    name: data.name.trim(),
    playlistId: data.playlistId,
    deviceId: data.targetDisplayIds[0] ?? "",
    startTime: data.startTime,
    endTime: data.endTime,
    daysOfWeek: daysFromForm(data),
    priority: 1,
    isActive: true,
  };
}

export function mapUpdateFormToScheduleRequest(
  id: string,
  data: ScheduleFormData,
): UpdateScheduleRequest {
  return {
    id,
    name: data.name.trim(),
    playlistId: data.playlistId,
    deviceId: data.targetDisplayIds[0] ?? "",
    startTime: data.startTime,
    endTime: data.endTime,
    daysOfWeek: daysFromForm(data),
    priority: 1,
    isActive: true,
  };
}
