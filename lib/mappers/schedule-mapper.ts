import type {
  BackendSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  UpdateScheduleSeriesRequest,
} from "@/lib/api/schedules-api";
import type {
  RecurrenceType,
  Schedule,
  ScheduleFormData,
} from "@/types/schedule";

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
  if (data.recurrence === "WEEKLY") {
    if (data.selectedDays && data.selectedDays.length > 0) {
      return [...data.selectedDays];
    }
    return [data.startDate.getDay()];
  }
  if (data.recurrence === "MONTHLY") {
    return [data.startDate.getDay()];
  }
  return [data.startDate.getDay()];
}

function normalizeDays(days: readonly number[]): number[] {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function mapBackendScheduleToSchedule(
  item: BackendSchedule,
  seriesDays: readonly number[],
): Schedule {
  return {
    id: item.id,
    seriesId: item.seriesId,
    name: item.name,
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    dayOfWeek: item.dayOfWeek,
    seriesDays: normalizeDays(seriesDays),
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
    recurrence: recurrenceFromDays(seriesDays),
    priority: item.priority,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapBackendSchedulesToSchedules(
  items: readonly BackendSchedule[],
): Schedule[] {
  const seriesDaysMap = new Map<string, number[]>();
  for (const item of items) {
    const existing = seriesDaysMap.get(item.seriesId) ?? [];
    existing.push(item.dayOfWeek);
    seriesDaysMap.set(item.seriesId, existing);
  }

  return items.map((item) =>
    mapBackendScheduleToSchedule(
      item,
      normalizeDays(seriesDaysMap.get(item.seriesId) ?? [item.dayOfWeek]),
    ),
  );
}

export function mapCreateFormToScheduleRequest(
  data: ScheduleFormData,
): CreateScheduleRequest {
  return {
    name: data.name.trim(),
    playlistId: data.playlistId,
    deviceId: data.targetDisplayIds[0] ?? "",
    startDate: toIsoDate(data.startDate),
    endDate: toIsoDate(data.endDate),
    startTime: data.startTime,
    endTime: data.endTime,
    daysOfWeek: normalizeDays(daysFromForm(data)),
    priority: data.priority,
    isActive: data.isActive,
  };
}

export function mapUpdateFormToScheduleRequest(
  id: string,
  data: ScheduleFormData,
): UpdateScheduleRequest {
  const days = normalizeDays(daysFromForm(data));
  return {
    id,
    name: data.name.trim(),
    playlistId: data.playlistId,
    deviceId: data.targetDisplayIds[0] ?? "",
    startDate: toIsoDate(data.startDate),
    endDate: toIsoDate(data.endDate),
    startTime: data.startTime,
    endTime: data.endTime,
    dayOfWeek: days[0] ?? data.startDate.getDay(),
    priority: data.priority,
    isActive: data.isActive,
  };
}

export function mapUpdateFormToScheduleSeriesRequest(
  seriesId: string,
  data: ScheduleFormData,
): UpdateScheduleSeriesRequest {
  return {
    seriesId,
    name: data.name.trim(),
    playlistId: data.playlistId,
    deviceId: data.targetDisplayIds[0] ?? "",
    startDate: toIsoDate(data.startDate),
    endDate: toIsoDate(data.endDate),
    startTime: data.startTime,
    endTime: data.endTime,
    daysOfWeek: normalizeDays(daysFromForm(data)),
    priority: data.priority,
    isActive: data.isActive,
  };
}
