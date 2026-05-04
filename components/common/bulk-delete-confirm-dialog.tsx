"use client";

import type { ReactElement } from "react";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";

interface BulkDeleteConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly selectedLabels: readonly string[];
  readonly title: string;
  readonly itemName: string;
  readonly itemNamePlural: string;
  readonly confirmLabel: string;
  readonly actionDescription: string;
  readonly onConfirm: () => Promise<void>;
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedLabels,
  title,
  itemName,
  itemNamePlural,
  confirmLabel,
  actionDescription,
  onConfirm,
}: BulkDeleteConfirmDialogProps): ReactElement {
  const count = selectedLabels.length;
  const previewLabels = selectedLabels.slice(0, 5);
  const overflowCount = Math.max(0, count - previewLabels.length);
  const noun = count === 1 ? itemName : itemNamePlural;

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        <div className="space-y-3">
          <p>
            {actionDescription} {count} {noun}. This action cannot be undone.
          </p>
          {previewLabels.length > 0 ? (
            <ul className="max-h-36 list-disc space-y-1 overflow-auto pl-4 text-left">
              {previewLabels.map((label) => (
                <li key={label} className="truncate">
                  {label}
                </li>
              ))}
              {overflowCount > 0 ? (
                <li className="text-muted-foreground">+{overflowCount} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      }
      confirmLabel={confirmLabel}
      errorFallback="Failed to complete bulk delete."
      onConfirm={onConfirm}
    />
  );
}
