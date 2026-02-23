"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditScheduleForm } from "@/components/schedules/schedule-form";
import type { Schedule, ScheduleFormData } from "@/types/schedule";

type EditScope = "single" | "series";

interface EditScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (
    schedule: Schedule,
    data: ScheduleFormData,
    scope: EditScope,
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
    selectedDays: [...schedule.seriesDays],
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
  const [pendingData, setPendingData] = useState<ScheduleFormData | null>(null);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!schedule) return null;
  const currentSchedule = schedule;
  const scheduleId = currentSchedule.id;

  async function handleSubmit(data: ScheduleFormData): Promise<void> {
    setPendingData(data);
    setScopeDialogOpen(true);
  }

  async function handleScopeSave(scope: EditScope): Promise<void> {
    if (!pendingData || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(currentSchedule, pendingData, scope);
      setScopeDialogOpen(false);
      onOpenChange(false);
    } catch {
      // Keep dialogs open so users can adjust and resubmit.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>

          <EditScheduleForm
            key={scheduleId}
            initialData={toFormData(currentSchedule)}
            availablePlaylists={availablePlaylists}
            availableDisplays={availableDisplays}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply changes</DialogTitle>
            <DialogDescription>
              Choose whether to update only this day or all days in this
              recurring schedule.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => void handleScopeSave("single")}
              disabled={isSaving}
            >
              This day only
            </Button>
            <Button
              onClick={() => void handleScopeSave("series")}
              disabled={isSaving}
            >
              Whole series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
