"use client";

import type { ReactElement, ReactNode } from "react";
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
import { cn } from "@/lib/utils";

interface ConfirmActionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: ReactNode;
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

  async function handleConfirm(): Promise<void> {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      const message = notifyApiError(error, errorFallback, {
        dedupe: false,
        id: "wildfire:confirm-action",
      });
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {typeof description === "string" ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : description ? (
            <div
              className={cn(
                "text-xs/relaxed text-balance text-muted-foreground md:text-pretty",
                "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
              )}
            >
              {description}
            </div>
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
