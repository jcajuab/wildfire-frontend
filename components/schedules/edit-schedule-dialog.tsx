"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
    schedule: Schedule,
    data: ScheduleFormData,
  ) => Promise<void> | void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableFlashContents: readonly { id: string; title: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
}

function toFormData(schedule: Schedule): ScheduleFormData {
  return {
    name: schedule.name,
    kind: schedule.kind,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    playlistId: schedule.playlist?.id ?? null,
    contentId: schedule.content?.id ?? null,
    targetDisplayIds: [schedule.display.id],
  };
}

export function EditScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onSave,
  availablePlaylists,
  availableFlashContents,
  availableDisplays,
}: EditScheduleDialogProps): ReactElement | null {
  const [isSaving, setIsSaving] = useState(false);

  if (!schedule) return null;

  const currentSchedule = schedule;

  async function handleSubmit(data: ScheduleFormData): Promise<void> {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(currentSchedule, data);
      onOpenChange(false);
    } catch {
      // Keep dialog open so users can adjust and resubmit.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>
            Update schedule timing, display assignment, and playlist selection.
          </DialogDescription>
        </DialogHeader>

        <EditScheduleForm
          key={schedule.id}
          initialData={toFormData(schedule)}
          availablePlaylists={availablePlaylists}
          availableFlashContents={availableFlashContents}
          availableDisplays={availableDisplays}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
