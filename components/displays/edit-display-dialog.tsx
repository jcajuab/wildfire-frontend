"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";

import { EditDisplayForm } from "@/components/displays/edit-display-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DisplayGroup } from "@/lib/api/displays-api";
import type { Display } from "@/types/display";

interface EditDisplayDialogProps {
  readonly display: Display | null;
  readonly existingGroups: readonly DisplayGroup[];
  readonly emergencyContentOptions?: readonly {
    readonly id: string;
    readonly title: string;
  }[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (display: Display) => Promise<boolean>;
  readonly canManageGroups?: boolean;
}

export function EditDisplayDialog({
  display,
  existingGroups,
  emergencyContentOptions = [],
  open,
  onOpenChange,
  onSave,
  canManageGroups = true,
}: EditDisplayDialogProps): ReactElement | null {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }
      handleClose();
    },
    [handleClose, onOpenChange],
  );

  if (!display) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          const target = (e.detail?.originalEvent as PointerEvent)
            ?.target as HTMLElement | null;
          if (target?.closest('[data-slot="combobox-content"]')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <EditDisplayForm
          key={`${display.id}:${open ? "open" : "closed"}`}
          display={display}
          existingGroups={existingGroups}
          emergencyContentOptions={emergencyContentOptions}
          onClose={handleClose}
          onSave={onSave}
          canManageGroups={canManageGroups}
        />
      </DialogContent>
    </Dialog>
  );
}
