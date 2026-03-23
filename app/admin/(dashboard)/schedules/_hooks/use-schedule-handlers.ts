"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import {
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useUpdateScheduleMutation,
} from "@/lib/api/schedules-api";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import {
  mapCreateFormToScheduleRequest,
  mapUpdateFormToScheduleRequest,
} from "@/lib/mappers/schedule-mapper";
import type { Schedule, ScheduleFormData } from "@/types/schedule";

const SCHEDULE_CREATE_FALLBACK_MESSAGE = "Failed to create schedule.";
const SCHEDULE_CONFLICT_MESSAGE =
  "Schedule overlaps with an existing schedule on the selected display.";

function isConflictError(err: unknown): boolean {
  if (typeof err !== "object" || err == null || !("status" in err)) {
    return false;
  }
  return (err as { status?: unknown }).status === 409;
}

export interface UseScheduleHandlersResult {
  handleCreateSchedule: (data: ScheduleFormData) => Promise<void>;
  handleDeleteSchedule: (schedule: Schedule) => Promise<void>;
  handleSaveSchedule: (
    schedule: Schedule,
    data: ScheduleFormData,
  ) => Promise<void>;
}

export function useScheduleHandlers(): UseScheduleHandlersResult {
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();

  const handleCreateSchedule = useCallback(
    async (data: ScheduleFormData) => {
      try {
        await Promise.all(
          data.targetDisplayIds.map((displayId) =>
            createSchedule(
              mapCreateFormToScheduleRequest(data, displayId),
            ).unwrap(),
          ),
        );
        toast.success(
          data.targetDisplayIds.length > 1
            ? `${data.targetDisplayIds.length} schedules created.`
            : "Schedule created.",
        );
      } catch (err) {
        if (isConflictError(err)) {
          notifyApiError(err, SCHEDULE_CONFLICT_MESSAGE);
          throw err;
        }
        notifyApiError(
          err,
          getApiErrorMessage(err, SCHEDULE_CREATE_FALLBACK_MESSAGE),
        );
        throw err;
      }
    },
    [createSchedule],
  );

  const handleDeleteSchedule = useCallback(
    async (schedule: Schedule) => {
      try {
        await deleteSchedule(schedule.id).unwrap();
        toast.success("Schedule deleted.");
      } catch (err) {
        notifyApiError(err, "Failed to delete schedule.");
      }
    },
    [deleteSchedule],
  );

  const handleSaveSchedule = useCallback(
    async (schedule: Schedule, data: ScheduleFormData) => {
      try {
        await updateSchedule(
          mapUpdateFormToScheduleRequest(schedule.id, data),
        ).unwrap();
        toast.success("Schedule updated.");
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to update schedule.");
        notifyApiError(err, message);
        throw err;
      }
    },
    [updateSchedule],
  );

  return {
    handleCreateSchedule,
    handleDeleteSchedule,
    handleSaveSchedule,
  };
}
