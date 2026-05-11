"use client";

import type { ReactElement } from "react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notifyApiError } from "@/lib/api/get-api-error-message";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const count = selectedLabels.length;
  const noun = count === 1 ? itemName : itemNamePlural;

  async function handleConfirm(): Promise<void> {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      notifyApiError(error, "Failed to complete bulk delete.", {
        dedupe: false,
        id: "wildfire:bulk-confirm-action",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean): void {
    if (!next && isSubmitting) return;
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <AlertDialogHeader className="px-4 pb-3 pt-4">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {actionDescription} {count} {noun}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="min-h-0 border-t border-border px-4 py-3">
          <div className="max-h-44 overflow-auto rounded-md border border-border bg-muted/20">
            {selectedLabels.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {selectedLabels.map((label) => (
                  <li
                    key={label}
                    className="truncate px-3 py-2 text-xs text-muted-foreground"
                    title={label}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No selected items.
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter className="border-t border-border bg-muted/10 px-4 py-3">
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isSubmitting}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {isSubmitting ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
