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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreatePairingCodeMutation,
  useRegisterDeviceMutation,
} from "@/lib/api/devices-api";
import { useCan } from "@/hooks/use-can";

interface DeviceRegistrationInfoDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function getRegisterErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "string") return data;
  }
  if (err instanceof Error) return err.message;
  return "Failed to register display.";
}

export function DeviceRegistrationInfoDialog({
  open,
  onOpenChange,
}: DeviceRegistrationInfoDialogProps): ReactElement {
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingCodeExpiresAt, setPairingCodeExpiresAt] = useState<
    string | null
  >(null);
  const canIssuePairingCode = useCan("devices:create");

  const [registerDevice, { isLoading: isSubmitting }] =
    useRegisterDeviceMutation();
  const [createPairingCode, { isLoading: isIssuingPairingCode }] =
    useCreatePairingCodeMutation();

  const resetForm = useCallback(() => {
    setIdentifier("");
    setName("");
    setLocation("");
    setPairingCode("");
    setPairingCodeExpiresAt(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedIdentifier = identifier.trim();
      const trimmedName = name.trim();
      const trimmedLocation = location.trim();
      const trimmedPairingCode = pairingCode.trim();

      if (!trimmedIdentifier || !trimmedName || !trimmedPairingCode) {
        toast.error("Identifier, name, and pairing code are required.");
        return;
      }

      try {
        await registerDevice({
          pairingCode: trimmedPairingCode,
          identifier: trimmedIdentifier,
          name: trimmedName,
          location: trimmedLocation || undefined,
        }).unwrap();
        toast.success("Display registered.");
        handleOpenChange(false);
        resetForm();
      } catch (err) {
        const message = getRegisterErrorMessage(err);
        if (typeof console !== "undefined" && console.error) {
          console.error("[devices.register] Registration failed", {
            message,
            identifier: trimmedIdentifier,
          });
        }
        toast.error(message);
      }
    },
    [
      identifier,
      name,
      location,
      pairingCode,
      registerDevice,
      handleOpenChange,
      resetForm,
    ],
  );

  const handleGeneratePairingCode = useCallback(async () => {
    try {
      const result = await createPairingCode().unwrap();
      setPairingCode(result.code);
      setPairingCodeExpiresAt(result.expiresAt);
      toast.success("Pairing code generated.");
    } catch (err) {
      const message = getRegisterErrorMessage(err);
      toast.error(message);
    }
  }, [createPairingCode]);

  const canSubmit =
    identifier.trim().length > 0 &&
    name.trim().length > 0 &&
    pairingCode.trim().length > 0 &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register your display</DialogTitle>
          <DialogDescription className="wrap-break-word">
            Register a display by providing its details and a one-time pairing
            code.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-identifier">Identifier</Label>
            <Input
              id="register-identifier"
              placeholder="display-01"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-name">Name</Label>
            <Input
              id="register-name"
              placeholder="Lobby Screen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-location">
              Location <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="register-location"
              placeholder="Hall"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="register-pairing-code">Pairing code</Label>
              {canIssuePairingCode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePairingCode}
                  disabled={isSubmitting || isIssuingPairingCode}
                >
                  {isIssuingPairingCode ? "Generating…" : "Generate code"}
                </Button>
              ) : null}
            </div>
            <Input
              id="register-pairing-code"
              placeholder="6-digit one-time pairing code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {pairingCodeExpiresAt ? (
              <p className="text-xs text-muted-foreground">
                Expires at {new Date(pairingCodeExpiresAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
