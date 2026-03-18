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
    kind: item.kind,
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    playlist: item.playlist
      ? {
          id: item.playlist.id,
          name: item.playlist.name ?? "Untitled playlist",
        }
      : null,
    content: item.content
      ? {
          id: item.content.id,
          title: item.content.title ?? "Untitled flash",
          type: "FLASH",
          flashMessage: item.content.flashMessage,
          flashTone: item.content.flashTone,
        }
      : null,
    targetDisplay: {
      id: item.display.id,
      name: item.display.name ?? "Unnamed display",
    },
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
  displayId: string,
): CreateScheduleRequest {
  return {
    name: data.name.trim(),
    kind: data.kind,
    playlistId: data.kind === "PLAYLIST" ? data.playlistId : null,
    contentId: data.kind === "FLASH" ? data.contentId : null,
    displayId,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
  };
}

export function mapUpdateFormToScheduleRequest(
  id: string,
  data: ScheduleFormData,
): UpdateScheduleRequest {
  return {
    id,
    name: data.name.trim(),
    kind: data.kind,
    playlistId: data.kind === "PLAYLIST" ? data.playlistId : null,
    contentId: data.kind === "FLASH" ? data.contentId : null,
    displayId: data.targetDisplayIds[0],
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
  };
}
