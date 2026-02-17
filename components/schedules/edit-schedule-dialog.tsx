"use client";

import type { ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditScheduleForm } from "@/components/schedules/schedule-form";
import type { Schedule, ScheduleFormData } from "@/types/schedule";

interface EditScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (
    scheduleId: string,
    data: ScheduleFormData,
  ) => Promise<void> | void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
}

function toFormData(schedule: Schedule): ScheduleFormData {
  return {
    name: schedule.name,
    startDate: new Date(schedule.startDate),
    endDate: new Date(schedule.endDate),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    playlistId: schedule.playlist.id,
    targetDisplayIds: schedule.targetDisplays.map((display) => display.id),
    recurrenceEnabled: schedule.recurrence !== "NONE",
    recurrence: schedule.recurrence === "NONE" ? "DAILY" : schedule.recurrence,
    priority: schedule.priority,
    isActive: schedule.isActive,
  };
}

export function EditScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onSave,
  availablePlaylists,
  availableDisplays,
}: EditScheduleDialogProps): ReactElement | null {
  if (!schedule) return null;
  const scheduleId = schedule.id;

  async function handleSave(data: ScheduleFormData): Promise<void> {
    await onSave(scheduleId, data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
        </DialogHeader>

        <EditScheduleForm
          key={scheduleId}
          initialData={toFormData(schedule)}
          availablePlaylists={availablePlaylists}
          availableDisplays={availableDisplays}
          onSubmit={handleSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
