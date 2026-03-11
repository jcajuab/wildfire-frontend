"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { useGlobalEmergency } from "@/hooks/use-global-emergency";

interface GlobalEmergencyButtonProps {
  variant: "sidebar" | "compact";
}

export function GlobalEmergencyButton({
  variant,
}: GlobalEmergencyButtonProps): ReactElement | null {
  const { isActive, isBusy, canRead, canUpdate, handleToggle } =
    useGlobalEmergency();

  if (!canRead) {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <Button
        variant={isActive ? "destructive" : "outline"}
        className="w-full"
        disabled={!canUpdate || isBusy}
        onClick={handleToggle}
      >
        <IconAlertTriangle />
        {isBusy
          ? "Updating..."
          : isActive
            ? "Stop Emergency"
            : "Start Emergency"}
      </Button>
    );
  }

  return (
    <Button
      variant={isActive ? "destructive" : "ghost"}
      size="icon"
      disabled={!canUpdate || isBusy}
      onClick={handleToggle}
      aria-label={isActive ? "Stop Emergency" : "Start Emergency"}
    >
      <IconAlertTriangle />
    </Button>
  );
}
