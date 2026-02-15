"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeviceRegistrationInfoDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const CURL_EXAMPLE = `curl -X POST YOUR_BACKEND_URL/devices \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_DEVICE_API_KEY" \\
  -d '{"identifier":"display-01","name":"Lobby Screen","location":"Hall"}'`;

export function DeviceRegistrationInfoDialog({
  open,
  onOpenChange,
}: DeviceRegistrationInfoDialogProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CURL_EXAMPLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Register your display</DialogTitle>
          <DialogDescription className='wrap-break-word'>
            Displays are registered by the device itself. Use the API from your
            Raspberry Pi or display client to register.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3 text-sm min-w-0'>
          <p className='font-medium'>Request</p>
          <ul className='list-inside list-disc space-y-1.5 text-muted-foreground wrap-break-word'>
            <li>
              <strong>Endpoint:</strong>{" "}
              <code className='rounded bg-muted px-1 break-all'>
                POST /devices
              </code>
            </li>
            <li>
              <strong>Header:</strong>{" "}
              <code className='rounded bg-muted px-1 break-all'>
                x-api-key: &lt;DEVICE_API_KEY&gt;
              </code>
            </li>
            <li>
              <strong>Body (JSON):</strong>{" "}
              <code className='rounded bg-muted px-1 break-all'>
                {`{ "identifier": "...", "name": "...", "location": "..." }`}
              </code>{" "}
              — <code className='rounded bg-muted px-1'>location</code> is
              optional.
            </li>
          </ul>
          <p className='font-medium'>Example (copy and replace placeholders)</p>
          <div className='flex flex-col gap-2 sm:relative min-w-0'>
            <pre className='min-w-0 overflow-x-auto rounded-md border bg-muted p-3 text-xs sm:pr-20'>
              <code>{CURL_EXAMPLE}</code>
            </pre>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='w-full sm:absolute sm:right-2 sm:top-2 sm:w-auto shrink-0'
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className='text-muted-foreground wrap-break-word'>
            Replace{" "}
            <code className='rounded bg-muted px-1 break-all'>
              YOUR_BACKEND_URL
            </code>{" "}
            with your API base (e.g.{" "}
            <code className='rounded bg-muted px-1 break-all'>
              http://localhost:8000
            </code>{" "}
            or your machine’s LAN IP for phone testing), and{" "}
            <code className='rounded bg-muted px-1 break-all'>
              YOUR_DEVICE_API_KEY
            </code>{" "}
            with the value from the backend{" "}
            <code className='rounded bg-muted px-1 break-all'>.env</code>. Once
            registered, the display will appear in this list. Updates (name,
            location) are also done by the device with the same endpoint.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
