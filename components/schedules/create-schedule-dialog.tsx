"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateScheduleForm } from "@/components/schedules/schedule-form";
import type { ScheduleFormData } from "@/types/schedule";

interface CreateScheduleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreate: (data: ScheduleFormData) => Promise<void> | void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  onCreate,
  availablePlaylists,
  availableDisplays,
}: CreateScheduleDialogProps): React.ReactElement {
  async function handleCreate(data: ScheduleFormData): Promise<void> {
    await onCreate(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Schedule</DialogTitle>
        </DialogHeader>

        <CreateScheduleForm
          availablePlaylists={availablePlaylists}
          availableDisplays={availableDisplays}
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
