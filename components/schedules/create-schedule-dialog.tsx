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
import {
  CreateScheduleForm,
  type ScheduleDisplayGroupOption,
} from "@/components/schedules/schedule-form";
import type { ScheduleFormData } from "@/types/schedule";

interface CreateScheduleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly kind: "PLAYLIST" | "FLASH";
  readonly onCreate: (data: ScheduleFormData) => Promise<void> | void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableFlashContents: readonly { id: string; title: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
  readonly availableDisplayGroups: readonly ScheduleDisplayGroupOption[];
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  kind,
  onCreate,
  availablePlaylists,
  availableFlashContents,
  availableDisplays,
  availableDisplayGroups,
}: CreateScheduleDialogProps): ReactElement {
  const [isMutating, setIsMutating] = useState(false);

  function handleOpenChange(next: boolean): void {
    if (!next && isMutating) return;
    onOpenChange(next);
  }

  async function handleCreate(data: ScheduleFormData): Promise<void> {
    try {
      await onCreate(data);
      onOpenChange(false);
    } catch {
      // Keep dialog open so users can adjust and resubmit.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isMutating}>
        <DialogHeader>
          <DialogTitle>
            {kind === "PLAYLIST"
              ? "Create Playlist Schedule"
              : "Create Flash Overlay Schedule"}
          </DialogTitle>
          <DialogDescription>
            {kind === "PLAYLIST"
              ? "Configure timing, playlist, and target display."
              : "Configure timing, flash content, and target display."}
          </DialogDescription>
        </DialogHeader>

        <CreateScheduleForm
          kind={kind}
          availablePlaylists={availablePlaylists}
          availableFlashContents={availableFlashContents}
          availableDisplays={availableDisplays}
          availableDisplayGroups={availableDisplayGroups}
          onSubmittingChange={setIsMutating}
          onSubmit={handleCreate}
          onCancel={() => {
            if (!isMutating) onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
