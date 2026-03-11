"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBaseUrl } from "@/lib/api/base-query";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useCloseRegistrationAttemptMutation,
  useCreateRegistrationAttemptMutation,
  useRotateRegistrationAttemptMutation,
} from "@/lib/api/displays-api";
import { formatTimeOfDay } from "@/lib/formatters";
import { useCan } from "@/hooks/use-can";

interface DisplayRegistrationInfoDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegistrationSucceeded?: () => void;
}

interface RegistrationSucceededEvent {
  readonly type: "registration_succeeded";
  readonly attemptId: string;
  readonly displayId: string;
  readonly slug: string;
  readonly occurredAt: string;
}

const MAX_TIMER_DELAY_MS = 2_147_483_647;

const isRegistrationSucceededEvent = (
  value: unknown,
): value is RegistrationSucceededEvent => {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<RegistrationSucceededEvent>;
  return (
    event.type === "registration_succeeded" &&
    typeof event.slug === "string" &&
    typeof event.attemptId === "string"
  );
};

export function DisplayRegistrationInfoDialog({
  open,
  onOpenChange,
  onRegistrationSucceeded,
}: DisplayRegistrationInfoDialogProps): ReactElement {
  const canIssueRegistrationCode = useCan("displays:create");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [registrationCodeExpiresAt, setRegistrationCodeExpiresAt] = useState<
    string | null
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createRegistrationAttempt, { isLoading: isCreatingAttempt }] =
    useCreateRegistrationAttemptMutation();
  const [rotateRegistrationAttempt, { isLoading: isRotatingAttempt }] =
    useRotateRegistrationAttemptMutation();
  const [closeRegistrationAttempt] = useCloseRegistrationAttemptMutation();

  const reset = useCallback(() => {
    setAttemptId(null);
    setRegistrationCode(null);
    setRegistrationCodeExpiresAt(null);
    setSuccessMessage(null);
  }, []);

  const rotateCode = useCallback(
    async (targetAttemptId: string): Promise<void> => {
      const rotated = await rotateRegistrationAttempt({
        attemptId: targetAttemptId,
      }).unwrap();
      setRegistrationCode(rotated.code);
      setRegistrationCodeExpiresAt(rotated.expiresAt);
    },
    [rotateRegistrationAttempt],
  );

  useEffect(() => {
    if (!open || !canIssueRegistrationCode) return;
    let isCancelled = false;
    (async () => {
      try {
        const created = await createRegistrationAttempt().unwrap();
        if (isCancelled) return;
        setAttemptId(created.attemptId);
        setRegistrationCode(created.code);
        setRegistrationCodeExpiresAt(created.expiresAt);
      } catch (err) {
        if (isCancelled) return;
        notifyApiError(err, "Failed to create registration attempt.");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [open, canIssueRegistrationCode, createRegistrationAttempt]);

  useEffect(() => {
    if (!open || !attemptId) return;
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;

    const stream = new EventSource(
      `${baseUrl}/displays/registration-attempts/${attemptId}/events`,
      { withCredentials: true },
    );

    const onSucceeded = (event: Event): void => {
      if (!(event instanceof MessageEvent)) return;
      try {
        const payload = JSON.parse(String(event.data)) as unknown;
        if (!isRegistrationSucceededEvent(payload)) return;
        setSuccessMessage(
          `Device "${payload.slug}" has been registered successfully.`,
        );
        onRegistrationSucceeded?.();
        void rotateCode(attemptId);
      } catch {
        // Ignore malformed events to keep stream resilient.
      }
    };

    stream.addEventListener("registration_succeeded", onSucceeded);

    return () => {
      stream.removeEventListener("registration_succeeded", onSucceeded);
      stream.close();
    };
  }, [open, attemptId, onRegistrationSucceeded, rotateCode]);

  useEffect(() => {
    if (!open || !attemptId || !registrationCodeExpiresAt) return;
    const expiresAtMs = Date.parse(registrationCodeExpiresAt);
    if (!Number.isFinite(expiresAtMs)) return;
    const timeoutMs = Math.min(
      MAX_TIMER_DELAY_MS,
      Math.max(0, expiresAtMs - Date.now()),
    );
    const timer = window.setTimeout(() => {
      void rotateCode(attemptId);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [open, attemptId, registrationCodeExpiresAt, rotateCode]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(next);
        return;
      }

      const currentAttemptId = attemptId;
      reset();
      onOpenChange(false);

      if (currentAttemptId) {
        void closeRegistrationAttempt({ attemptId: currentAttemptId }).unwrap();
      }
    },
    [attemptId, closeRegistrationAttempt, onOpenChange, reset],
  );

  const statusText = useMemo(() => {
    if (isCreatingAttempt) return "Creating registration attempt…";
    if (isRotatingAttempt) return "Rotating code…";
    return null;
  }, [isCreatingAttempt, isRotatingAttempt]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-[calc(100%-2rem)] sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Register Display</DialogTitle>
          <DialogDescription asChild>
            <ol className='mt-1 list-none space-y-1 text-sm text-muted-foreground'>
              <li>
                <span className='mr-1 font-medium text-foreground'>1.</span>
                On the display device, open a web browser.
              </li>
              <li>
                <span className='mr-1 font-medium text-foreground'>2.</span>
                Navigate to
                <span className='mx-1 font-medium text-foreground'>
                  /admin/displays/register
                </span>
              </li>
              <li>
                <span className='mr-1 font-medium text-foreground'>3.</span>
                Enter the code below and complete registration before it expires
                in 10 minutes.
              </li>
            </ol>
          </DialogDescription>
        </DialogHeader>

        <div className='rounded-md border border-border bg-muted/30 p-4 text-sm text-center'>
          <p className='text-muted-foreground'>Active registration code</p>
          <p className='mt-2 text-3xl font-semibold tracking-[0.25em]'>
            {registrationCode ?? "------"}
          </p>
          {registrationCodeExpiresAt ? (
            <p className='mt-2 text-xs text-muted-foreground'>
              Expires at {formatTimeOfDay(registrationCodeExpiresAt)}
            </p>
          ) : null}
          {statusText ? (
            <p
              className='mt-2 text-xs text-muted-foreground'
              role='status'
              aria-live='polite'
              aria-atomic='true'
            >
              {statusText}
            </p>
          ) : null}
        </div>

        {successMessage ? (
          <p
            className='rounded-md bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {successMessage}
          </p>
        ) : null}

        <DialogFooter className='sm:justify-end'>
          {canIssueRegistrationCode ? (
            <Button
              type='button'
              variant='outline'
              disabled={!attemptId || isCreatingAttempt || isRotatingAttempt}
              onClick={() => {
                if (!attemptId) return;
                void rotateCode(attemptId);
              }}
            >
              Rotate Code
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
