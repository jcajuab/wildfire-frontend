"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { RequiredLabel } from "@/components/common/required-label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  collapseDisplayGroupWhitespace,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";

interface CreateDisplayGroupDialogProps {
  readonly open: boolean;
  readonly existingGroups: readonly DisplayGroup[];
  readonly isPending: boolean;
  readonly onCreate: (name: string) => Promise<void>;
  readonly onClose: () => void;
}

export function CreateDisplayGroupDialog({
  open,
  existingGroups,
  isPending,
  onCreate,
  onClose,
}: CreateDisplayGroupDialogProps): ReactElement {
  const [name, setName] = useState("");

  const trimmed = collapseDisplayGroupWhitespace(name);
  const isDuplicate = existingGroups.some(
    (g) => toDisplayGroupKey(g.name) === toDisplayGroupKey(trimmed),
  );
  const canCreate = trimmed.length > 0 && !isDuplicate && !isPending;
  const errorMessage = isDuplicate
    ? "A group with this name already exists."
    : null;

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    await onCreate(trimmed);
    setName("");
  }, [canCreate, onCreate, trimmed]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add Display Group</DialogTitle>
          <DialogDescription>
            Create a display group for organizing registered displays.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <RequiredLabel htmlFor="new-group-name-input">
            Display Group Name
          </RequiredLabel>
          <Input
            id="new-group-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
            disabled={isPending}
          />
          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </div>
        <DialogFooter className="flex-row justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={!canCreate}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
