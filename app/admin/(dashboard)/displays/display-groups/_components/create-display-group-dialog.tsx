"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogTitle className="sr-only">Add display group</DialogTitle>
        <div className="space-y-2">
          <Label htmlFor="new-group-name-input">Display group name</Label>
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
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
