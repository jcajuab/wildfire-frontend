"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast container. Renders at bottom-right by default.
 * Use `import { toast } from "sonner"` to show toasts (e.g. toast.error("Failed to remove user")).
 */
export function Toaster(): React.ReactElement {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          error: "border-destructive/50 bg-destructive/10 text-destructive",
        },
      }}
    />
  );
}
