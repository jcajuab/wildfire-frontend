"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collapseDisplayGroupWhitespace } from "@/lib/display-group-normalization";

interface RenameDisplayGroupDialogProps {
  readonly open: boolean;
  readonly initialName: string;
  readonly isPending: boolean;
  readonly onSave: (name: string) => Promise<void>;
  readonly onClose: () => void;
}

// Keyed by groupId from parent — remounts on group change, so no reset effect needed.
export function RenameDisplayGroupDialog({
  open,
  initialName,
  isPending,
  onSave,
  onClose,
}: RenameDisplayGroupDialogProps): ReactElement {
  const [name, setName] = useState(initialName);

  const trimmed = collapseDisplayGroupWhitespace(name);
  const canSave =
    trimmed.length > 0 && trimmed !== initialName.trim() && !isPending;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await onSave(trimmed);
  }, [canSave, onSave, trimmed]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Rename Display Group</DialogTitle>
          <DialogDescription>
            Update the display group name used across display management.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="group-name-input">Display Group Name</Label>
          <Input
            id="group-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
            }}
            disabled={isPending}
          />
        </div>
        <DialogFooter className="flex-row justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
