"use client";

import type { ReactElement } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeviceRegistrationInfoDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function DeviceRegistrationInfoDialog({
  open,
  onOpenChange,
}: DeviceRegistrationInfoDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register your display</DialogTitle>
          <DialogDescription>
            Displays are registered by the device itself. Use the API from your
            Raspberry Pi or display client to register.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-medium">Request</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              <strong>Endpoint:</strong>{" "}
              <code className="rounded bg-muted px-1">POST /devices</code>
            </li>
            <li>
              <strong>Header:</strong>{" "}
              <code className="rounded bg-muted px-1">
                x-api-key: &lt;DEVICE_API_KEY&gt;
              </code>
            </li>
            <li>
              <strong>Body (JSON):</strong>{" "}
              <code className="rounded bg-muted px-1">{`{ "identifier", "name", "location?" }`}</code>
            </li>
          </ul>
          <p className="text-muted-foreground">
            Once registered, the display will appear in this list. Updates
            (name, location) are also done by the device with the same endpoint.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
