"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
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
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";

interface ConfirmActionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly onConfirm: () => Promise<void> | void;
  readonly errorFallback?: string;
  readonly onError?: (errorMessage: string) => void;
  readonly destructive?: boolean;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  errorFallback = "Unable to complete this action. Try again.",
  onError,
  destructive = true,
}: ConfirmActionDialogProps): ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      const message = getApiErrorMessage(error, errorFallback);
      setActionError(message);
      notifyApiError(error, errorFallback, {
        dedupe: false,
        id: "wildfire:confirm-action",
      });
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setActionError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
          {actionError ? (
            <p
              className="mt-2 text-xs text-destructive"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <span className="inline-flex items-center gap-1">
                <IconAlertCircle className="size-3" />
                <span>{actionError}</span>
              </span>
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            variant={destructive ? "destructive" : "default"}
          >
            {isSubmitting ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
