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
import { useRegisterDeviceMutation } from "@/lib/api/devices-api";

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
  const [apiKey, setApiKey] = useState("");

  const [registerDevice, { isLoading: isSubmitting }] =
    useRegisterDeviceMutation();

  const resetForm = useCallback(() => {
    setIdentifier("");
    setName("");
    setLocation("");
    setApiKey("");
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
      const trimmedApiKey = apiKey.trim();

      if (!trimmedIdentifier || !trimmedName || !trimmedApiKey) {
        toast.error("Identifier, name, and device API key are required.");
        return;
      }

      try {
        await registerDevice({
          identifier: trimmedIdentifier,
          name: trimmedName,
          location: trimmedLocation || undefined,
          apiKey: trimmedApiKey,
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
      apiKey,
      registerDevice,
      handleOpenChange,
      resetForm,
    ],
  );

  const canSubmit =
    identifier.trim().length > 0 &&
    name.trim().length > 0 &&
    apiKey.trim().length > 0 &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register your display</DialogTitle>
          <DialogDescription className="wrap-break-word">
            Register a display by providing its details and the device API key
            (from backend .env DEVICE_API_KEY).
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
            <Label htmlFor="register-api-key">Device API key</Label>
            <Input
              id="register-api-key"
              type="password"
              placeholder="Value from backend .env DEVICE_API_KEY"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
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
