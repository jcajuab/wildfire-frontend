"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { useCreateRegistrationCodeMutation } from "@/lib/api/displays-api";
import { useCan } from "@/hooks/use-can";

interface DisplayRegistrationInfoDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function DisplayRegistrationInfoDialog({
  open,
  onOpenChange,
}: DisplayRegistrationInfoDialogProps): ReactElement {
  const canIssueRegistrationCode = useCan("displays:create");
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [registrationCodeExpiresAt, setRegistrationCodeExpiresAt] = useState<
    string | null
  >(null);

  const [createRegistrationCode, { isLoading: isIssuingRegistrationCode }] =
    useCreateRegistrationCodeMutation();

  const reset = useCallback(() => {
    setRegistrationCode(null);
    setRegistrationCodeExpiresAt(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        reset();
      }
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleGenerateRegistrationCode = useCallback(async () => {
    try {
      const result = await createRegistrationCode().unwrap();
      setRegistrationCode(result.code);
      setRegistrationCodeExpiresAt(result.expiresAt);
      toast.success("Registration code generated.");
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Failed to generate registration code."),
      );
    }
  }, [createRegistrationCode]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Display Registration Code</DialogTitle>
          <DialogDescription>
            Generate a one-time code, then complete registration on the display
            at
            <span className="mx-1 font-medium">/displays/register</span>
            using display slug, output, and resolution. The display will appear
            in the admin list after registration completes on the display.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <p className="text-muted-foreground">Current registration code</p>
          <p className="mt-2 text-3xl font-semibold tracking-[0.25em]">
            {registrationCode ?? "------"}
          </p>
          {registrationCodeExpiresAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Expires at{" "}
              {new Date(registrationCodeExpiresAt).toLocaleTimeString()}
            </p>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-end">
          {canIssueRegistrationCode ? (
            <Button
              type="button"
              onClick={handleGenerateRegistrationCode}
              disabled={isIssuingRegistrationCode}
            >
              {isIssuingRegistrationCode ? "Generating…" : "Generate code"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
