import type {
  BackendSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from "@/lib/api/schedules-api";
import type { Schedule, ScheduleFormData } from "@/types/schedule";

export function mapBackendScheduleToSchedule(item: BackendSchedule): Schedule {
  return {
    id: item.id,
    name: item.name,
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    playlist: {
      id: item.playlist.id,
      name: item.playlist.name ?? "Untitled playlist",
    },
    targetDisplay: {
      id: item.display.id,
      name: item.display.name ?? "Unnamed display",
    },
    priority: item.priority,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapBackendSchedulesToSchedules(
  items: readonly BackendSchedule[],
): Schedule[] {
  return items.map((item) => mapBackendScheduleToSchedule(item));
}

export function mapCreateFormToScheduleRequest(
  data: ScheduleFormData,
): CreateScheduleRequest {
  return {
    name: data.name.trim(),
    playlistId: data.playlistId,
    displayId: data.targetDisplayId,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    priority: data.priority,
    isActive: data.isActive,
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
    displayId: data.targetDisplayId,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    priority: data.priority,
    isActive: data.isActive,
  };
}
