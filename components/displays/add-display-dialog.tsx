"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";

import { AddDisplayWizard } from "@/components/displays/add-display-wizard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DisplayGroup } from "@/lib/api/displays-api";
import type { Display } from "@/types/display";

interface AddDisplayDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegister: (display: Omit<Display, "id" | "createdAt">) => void;
  readonly existingGroups?: readonly DisplayGroup[];
}

export function AddDisplayDialog({
  open,
  onOpenChange,
  onRegister,
  existingGroups = [],
}: AddDisplayDialogProps): ReactElement {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

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
        <AddDisplayWizard
          key={open ? "open" : "closed"}
          onRegister={onRegister}
          onClose={handleClose}
          existingGroups={existingGroups}
        />
      </DialogContent>
    </Dialog>
  );
}
