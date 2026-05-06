"use client";

import type { ReactElement } from "react";
import { IconSettings } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BackendDisplay } from "@/lib/api/displays-api";

interface DisplaySidebarCardProps {
  readonly display: BackendDisplay;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly onSettings: (e: React.MouseEvent) => void;
  readonly canManage: boolean;
}

const STATUS_DOT_CLASS: Record<BackendDisplay["status"], string> = {
  LIVE: "bg-emerald-500",
  READY: "bg-sky-500",
  PROCESSING: "bg-amber-500",
  DOWN: "bg-muted-foreground/40",
};

export function DisplaySidebarCard({
  display,
  isSelected,
  onSelect,
  onSettings,
  canManage,
}: DisplaySidebarCardProps): ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors select-none",
        isSelected
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-background hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          STATUS_DOT_CLASS[display.status],
        )}
        aria-label={`Status: ${display.status}`}
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {display.name}
      </span>
      {canManage ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Edit display details"
          onClick={(e) => {
            e.stopPropagation();
            onSettings(e);
          }}
        >
          <IconSettings className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
