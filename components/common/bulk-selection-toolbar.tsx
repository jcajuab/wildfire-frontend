"use client";

import type { ReactElement } from "react";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface BulkSelectionToolbarProps {
  readonly selectedCount: number;
  readonly deleteLabel: string;
  readonly onDelete: () => void;
  readonly onCancel: () => void;
}

export function BulkSelectionToolbar({
  selectedCount,
  deleteLabel,
  onDelete,
  onCancel,
}: BulkSelectionToolbarProps): ReactElement {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:w-auto sm:flex-row sm:items-center">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={selectedCount === 0}
        >
          <IconTrash className="size-3.5" aria-hidden="true" />
          {deleteLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {selectedCount > 0 ? (
            <IconX className="size-3.5" aria-hidden="true" />
          ) : (
            <IconCheck className="size-3.5" aria-hidden="true" />
          )}
          Cancel
        </Button>
      </div>
    </div>
  );
}
