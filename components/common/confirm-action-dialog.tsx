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

  function handleOpenChange(next: boolean): void {
    if (!next && isSubmitting) return;
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <AlertDialogHeader className="place-items-start px-4 pb-3 pt-4 text-left">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {typeof description === "string" ? (
            <AlertDialogDescription className="text-left text-pretty">
              {description}
            </AlertDialogDescription>
          ) : description ? (
            <div
              className={cn(
                "text-xs/relaxed text-pretty text-muted-foreground",
                "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
              )}
            >
              {description}
            </div>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border bg-muted/10 px-4 py-3">
          <AlertDialogCancel disabled={isSubmitting}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={isSubmitting}
            variant={destructive ? "destructive" : "default"}
          >
            {isSubmitting ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
